import { ConflictException, Injectable, BadRequestException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { createHash } from 'crypto';
import { RegistryRecord } from './registry-record.schema';
import { RegistryCommit } from './registry-commit.schema';
import { RegistryBatchDto } from './dto';

function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical(value[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
function hash(value: unknown): string { return createHash('sha256').update(canonical(value)).digest('hex'); }
function validDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(value) && !Number.isNaN(Date.parse(value));
}
@Injectable()
export class RegistryPersistenceService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(RegistryRecord.name) private readonly records: Model<RegistryRecord>,
    @InjectModel(RegistryCommit.name) private readonly commits: Model<RegistryCommit>,
  ) {}

  async commit(tenantId: string, batch: RegistryBatchDto) {
    if (!tenantId || typeof tenantId !== 'string') throw new BadRequestException('Authenticated tenant context is required');
    if (!batch?.batchId?.trim() || !Array.isArray(batch.incoming)) throw new BadRequestException('batchId and incoming[] are required');
    for (const [i, r] of batch.incoming.entries()) {
      if (!r || !r.domain?.trim() || !r.recordId?.trim() || !validDate(r.recordedAt) || !r.payload || Array.isArray(r.payload) || typeof r.payload !== 'object') {
        throw new BadRequestException(`Invalid incoming record at index ${i}`);
      }
      if (r.operation && !['create', 'update', 'upsert'].includes(r.operation)) throw new BadRequestException(`Invalid operation at index ${i}`);
    }
    const seen = new Set<string>();
    for (const r of batch.incoming) {
      const key = `${r.domain}:${r.recordId}`;
      if (seen.has(key)) throw new ConflictException(`Duplicate key in batch: ${key}`);
      seen.add(key);
    }

    const session = await this.connection.startSession();
    let response: any;
    try {
      await session.withTransaction(async () => {
        // Resolve retries before checking expectedRevision: a successful request may be
        // retried after later batches have advanced the store revision.
        const batchHash = hash({ batchId: batch.batchId, incoming: batch.incoming });
        const existingCommit = await this.commits.findOne({ tenantId, kind: 'batch', batchHash }).session(session).lean();
        if (existingCommit) {
          response = {
            committed: true,
            idempotent: true,
            tenantId,
            // Report the revision at which this batch committed, not today's revision.
            storeRevision: Number.isInteger(existingCommit.toRevision) ? existingCommit.toRevision : 0,
            commit: existingCommit,
          };
          return;
        }
        const revDoc = await this.commits.findOne({ tenantId, kind: 'revision' }).session(session).lean();
        const revision = Number.isInteger(revDoc?.revision) ? revDoc!.revision! : 0;
        if (batch.expectedRevision !== undefined && batch.expectedRevision !== revision) {
          throw new ConflictException({ code: 'REVISION_CONFLICT', expected: batch.expectedRevision, actual: revision });
        }
        const current = await this.records.find({ tenantId }).session(session).lean();
        const byKey = new Map(current.map((r: any) => [`${r.domain}:${r.recordId}`, r]));
        const now = new Date().toISOString();
        let created = 0, updated = 0, unchanged = 0;
        const writes: any[] = [];
        for (const r of batch.incoming) {
          const key = `${r.domain}:${r.recordId}`;
          const old: any = byKey.get(key);
          const payloadHash = hash(r.payload);
          if (!old) {
            if (r.operation === 'update') throw new ConflictException({ code: 'MISSING_RECORD', key });
            writes.push({ ...r, tenantId, payloadHash, version: 1, createdAt: now, updatedAt: now, lastBatchId: batch.batchId });
            created++;
          } else if (old.payloadHash === payloadHash) {
            unchanged++;
          } else {
            if (r.operation === 'create') throw new ConflictException({ code: 'RECORD_EXISTS', key });
            if (r.masterVersion === undefined || r.masterVersion !== old.version) {
              throw new ConflictException({ code: 'VERSION_CONFLICT', key, expected: r.masterVersion ?? null, actual: old.version });
            }
            writes.push({ ...r, tenantId, payloadHash, version: old.version + 1, createdAt: old.createdAt, updatedAt: now, lastBatchId: batch.batchId });
            updated++;
          }
        }
        const changed = created + updated > 0;
        if (changed) {
          // Upserts are scoped to tenant + stable record key and run in this transaction.
          for (const doc of writes) {
            const writeResult = await this.records.updateOne(
              { tenantId, domain: doc.domain, recordId: doc.recordId, ...(doc.version > 1 ? { version: doc.version - 1 } : { version: { $exists: false } }) },
              { $set: doc },
              { upsert: doc.version === 1, session, runValidators: true },
            );
            if (writeResult.matchedCount === 0 && writeResult.upsertedCount === 0) {
              throw new ConflictException({ code: 'WRITE_VERSION_CONFLICT', key: `${doc.domain}:${doc.recordId}` });
            }
          }
        }
        const nextRevision = changed ? revision + 1 : revision;
        const all = await this.records.find({ tenantId }).session(session).lean();
        const snapshotHash = hash(all.map((r: any) => ({ domain: r.domain, recordId: r.recordId, version: r.version, payloadHash: r.payloadHash })).sort((a: any,b: any) => `${a.domain}:${a.recordId}`.localeCompare(`${b.domain}:${b.recordId}`)));
        const commitId = hash({ tenantId, batchHash, fromRevision: revision, toRevision: nextRevision });
        const commit = { tenantId, commitId, kind: 'batch', batchId: batch.batchId, batchHash, committedAt: now, fromRevision: revision, toRevision: nextRevision, result: { input: batch.incoming.length, created, updated, unchanged }, masterSnapshotHash: snapshotHash };
        await this.commits.create([commit], { session });
        if (changed) await this.commits.updateOne(
          { tenantId, kind: 'revision' },
          { $set: { revision: nextRevision, updatedAt: now }, $setOnInsert: { tenantId, kind: 'revision', commitId: `revision:${tenantId}` } },
          { upsert: true, session },
        );
        response = { committed: true, idempotent: !changed, tenantId, storeRevision: nextRevision, commit, summary: commit.result };
      });
      return response;
    } finally {
      await session.endSession();
    }
  }
}

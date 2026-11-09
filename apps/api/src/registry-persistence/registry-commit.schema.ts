import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true, strict: true })
export class RegistryCommit {
  @Prop({ required: true, index: true }) tenantId!: string;
  @Prop({ required: true }) commitId!: string;
  @Prop({ required: true }) kind!: string;
  @Prop() batchId?: string;
  @Prop() batchHash?: string;
  @Prop() committedAt?: string;
  @Prop() fromRevision?: number;
  @Prop() toRevision?: number;
  @Prop({ type: MongooseSchema.Types.Mixed }) result?: Record<string, unknown>;
  @Prop() masterSnapshotHash?: string;
  @Prop() revision?: number;
}
export type RegistryCommitDocument = HydratedDocument<RegistryCommit>;
export const RegistryCommitSchema = SchemaFactory.createForClass(RegistryCommit);
RegistryCommitSchema.index({ tenantId: 1, commitId: 1 }, { unique: true, name: 'tenant_commit_unique' });
RegistryCommitSchema.index({ tenantId: 1, kind: 1 }, { unique: true, partialFilterExpression: { kind: 'revision' }, name: 'tenant_revision_singleton' });

RegistryCommitSchema.index(
  { tenantId: 1, kind: 1, batchHash: 1 },
  {
    unique: true,
    partialFilterExpression: {
      kind: 'batch',
      batchHash: { $type: 'string' },
    },
    name: 'tenant_batch_hash_unique',
  },
);
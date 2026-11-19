import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JournalEntry } from './accounting.schema';
import { FinanceGlAdapter } from './finance-gl-adapter.service';
import { FinanceTransaction } from '../finance/finance.schema';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';

export type BackfillReport = {
  organizationId: string;
  scanned: number;
  alreadyPosted: number;
  newlyPosted: number;
  skipped: number;
  errors: Array<{ transactionId: string; transactionDocId: string; error: string }>;
  durationMs: number;
};

@Injectable()
export class BackfillService {
  private readonly logger = new Logger(BackfillService.name);

  constructor(
    @InjectModel(FinanceTransaction.name) private transactions: Model<FinanceTransaction>,
    @InjectModel(JournalEntry.name) private entries: Model<JournalEntry>,
    private readonly gl: FinanceGlAdapter,
  ) {}

  async backfill(rawContext: OrganizationContext): Promise<BackfillReport> {
    const context = requireOrganizationContext(rawContext);
    const start = Date.now();

    const txs = await this.transactions
      .find(organizationFilter(context))
      .sort({ date: 1 })
      .lean();

    const report: BackfillReport = {
      organizationId: context.organizationId,
      scanned: txs.length,
      alreadyPosted: 0,
      newlyPosted: 0,
      skipped: 0,
      errors: [],
      durationMs: 0,
    };

    for (const tx of txs) {
      // Check for existing JournalEntry
      const existing = await this.entries.findOne(
        organizationFilter(context, {
          sourceType: 'FinanceTransaction',
          sourceId: String(tx._id),
        }),
      ).lean();
      if (existing) {
        report.alreadyPosted++;
        continue;
      }

      // Skip Transfers (no journal = intentional skip from Phase A)
      if (tx.direction === 'Transfer') {
        report.skipped++;
        continue;
      }

      try {
        await this.gl.postTransaction(context, tx);
        report.newlyPosted++;
      } catch (e: any) {
        const error = e?.message ?? String(e);
        this.logger.error(`Backfill failed for ${tx.transactionId}: ${error}`);
        report.errors.push({
          transactionId: tx.transactionId,
          transactionDocId: String(tx._id),
          error,
        });
      }
    }

    report.durationMs = Date.now() - start;
    this.logger.log(
      `Backfill complete: scanned=${report.scanned} newlyPosted=${report.newlyPosted} ` +
      `already=${report.alreadyPosted} skipped=${report.skipped} errors=${report.errors.length} ` +
      `in ${report.durationMs}ms`,
    );
    return report;
  }
}
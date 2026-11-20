import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AccountingPeriod, JournalEntry } from './accounting.schema';
import { OrganizationContext, requireOrganizationContext } from '../organizations/organization-context';
import { organizationDocument, organizationFilter } from '../organizations/organization-scope';

export type PeriodRow = {
  _id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  locked: boolean;
  lockedAt?: string;
  lockedBy?: string;
  closedAt?: string;
  closedBy?: string;
  reopenReason?: string;
  journalEntryCount: number;
  postedCount: number;
  unpostedCount: number;
};

@Injectable()
export class PeriodsService {
  constructor(
    @InjectModel(AccountingPeriod.name) private periods: Model<AccountingPeriod>,
    @InjectModel(JournalEntry.name) private entries: Model<JournalEntry>,
  ) {}

  async list(rawContext: OrganizationContext): Promise<PeriodRow[]> {
    const context = requireOrganizationContext(rawContext);
    const periods = await this.periods
      .find(organizationFilter(context))
      .sort({ periodStart: -1 })
      .lean();

    const result: PeriodRow[] = [];
    for (const p of periods) {
      const [journalEntryCount, postedCount] = await Promise.all([
        this.entries.countDocuments(
          organizationFilter(context, {
            date: { $gte: p.periodStart, $lte: p.periodEnd },
          }),
        ),
        this.entries.countDocuments(
          organizationFilter(context, {
            date: { $gte: p.periodStart, $lte: p.periodEnd },
            posted: true,
            voided: false,
          }),
        ),
      ]);
      result.push({
        _id: String(p._id),
        periodStart: (p.periodStart as Date).toISOString().slice(0, 10),
        periodEnd: (p.periodEnd as Date).toISOString().slice(0, 10),
        status: p.status,
        locked: p.locked,
        lockedAt: p.lockedAt ? (p.lockedAt as Date).toISOString() : undefined,
        lockedBy: p.lockedBy,
        closedAt: p.closedAt ? (p.closedAt as Date).toISOString() : undefined,
        closedBy: p.closedBy,
        reopenReason: p.reopenReason,
        journalEntryCount,
        postedCount,
        unpostedCount: journalEntryCount - postedCount,
      });
    }
    return result;
  }

  async lockPeriod(
    rawContext: OrganizationContext,
    year: number,
    month: number,
    actor: string,
  ): Promise<PeriodRow> {
    const context = requireOrganizationContext(rawContext);
    if (month < 1 || month > 12) throw new BadRequestException('month must be 1–12');

    const start = new Date(Date.UTC(year, month - 1, 1));
    const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    // 1. Find or create the period
    let period = await this.periods.findOne(
      organizationFilter(context, { periodStart: start, periodEnd: end }),
    );

    if (!period) {
      period = await this.periods.create(
        organizationDocument(context, {
          periodStart: start,
          periodEnd: end,
          status: 'open',
          locked: false,
        }),
      );
    }

    if (period.locked) {
      throw new BadRequestException(
        `Period ${start.toISOString().slice(0, 10)} – ${end.toISOString().slice(0, 10)} is already locked.`,
      );
    }

    // 2. Pre-close checks
    const unposted = await this.entries.countDocuments(
      organizationFilter(context, {
        date: { $gte: start, $lte: end },
        posted: false,
        voided: false,
      }),
    );
    if (unposted > 0) {
      throw new BadRequestException(
        `Cannot lock period: ${unposted} unposted journal ${unposted === 1 ? 'entry' : 'entries'} in this period. Post them first.`,
      );
    }

    // 3. Flip the lock
    period.locked = true;
    period.lockedAt = new Date();
    period.lockedBy = actor;
    period.status = 'closed';
    period.closedAt = new Date();
    period.closedBy = actor;
    await period.save();

    return (await this.list(rawContext)).find(p => p._id === String(period!._id))!;
  }

  async reopenPeriod(
    rawContext: OrganizationContext,
    id: string,
    reason: string,
    actor: string,
  ): Promise<PeriodRow> {
    const context = requireOrganizationContext(rawContext);
    if (!reason || reason.trim().length < 10) {
      throw new BadRequestException('Reopen reason must be at least 10 characters.');
    }
    const period = await this.periods.findOne(organizationFilter(context, { _id: id }));
    if (!period) throw new NotFoundException('Period not found');
    if (!period.locked) {
      throw new BadRequestException('Period is already open.');
    }

    period.locked = false;
    period.status = 'open';
    period.reopenReason = `${new Date().toISOString()} — ${actor}: ${reason.trim()}`;
    // Do not clear lockedAt / closedAt — keep audit trail of the original close
    await period.save();

    return (await this.list(rawContext)).find(p => p._id === String(period._id))!;
  }
}
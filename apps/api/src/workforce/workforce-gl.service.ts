import { Injectable, Logger } from '@nestjs/common';
import { PostingService } from '../accounting/posting.service';
import { OrganizationContext } from '../organizations/organization-context';

@Injectable()
export class WorkforceGlService {
  private readonly logger = new Logger(WorkforceGlService.name);

  constructor(private readonly posting: PostingService) {}

  async postLabourEntry(
    context: OrganizationContext,
    entry: any,
    task: any,
  ): Promise<void> {
    if (!entry.labourCostUgx || entry.labourCostUgx <= 0) return;

    const expenseAccount = this.accountForActivity(task?.activity ?? '');

    await this.posting.post(context, {
      date: new Date(entry.workDate),
      description: `Labour: ${task?.taskCode ?? 'task'} — ${entry.workerCode} (${entry.hoursWorked}h)`,
      sourceType: 'LabourEntry',
      sourceId: String(entry._id),
      createdBy: entry.recordedBy,
      lines: [
        {
          accountCode: expenseAccount,
          debit: entry.labourCostUgx,
          memo: `${task?.activity ?? 'Labour'} — ${entry.workerCode}`,
        },
        {
          accountCode: '1000',
          credit: entry.labourCostUgx,
          memo: `Labour payment for ${entry.workerCode}`,
        },
      ],
    });

    this.logger.log(
      `Posted labour GL: ${entry.workerCode} ${entry.labourCostUgx} UGX on ${entry.workDate}`,
    );
  }

  private accountForActivity(activity: string): string {
    const a = activity.toLowerCase();
    if (/planting|nursery|seedling|transplant/.test(a)) return '6100';
    if (/hive|bee|apiary|colony/.test(a)) return '6010';
    if (/weed|prun|firebreak|tree count|growth|harvest|site maint|field/.test(a)) return '6000';
    return '6000';
  }
}
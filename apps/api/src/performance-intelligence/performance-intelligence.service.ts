import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinanceTransaction } from '../finance/finance.schema';
import { StockItem } from '../inventory-control/inventory.schema';
import { LabourTask } from '../workforce/workforce.schema';
import { WorkflowEvent } from '../integration-workflows/workflow-event.schema';
import { PerformanceTarget, PerformanceTargetDocument, PerformanceUpdate } from '../performance-strategy/performance.schema';

type Metric = { key:string; title:string; unit:string; value:number; source:string; periodStart:string; periodEnd:string; caveat:string };
@Injectable()
export class PerformanceIntelligenceService {
  constructor(
    @InjectModel(FinanceTransaction.name) private finance:Model<any>,
    @InjectModel(StockItem.name) private stock:Model<any>,
    @InjectModel(LabourTask.name) private tasks:Model<any>,
    @InjectModel(WorkflowEvent.name) private workflows:Model<any>,
    @InjectModel(PerformanceTarget.name) private targets:Model<PerformanceTargetDocument>,
    @InjectModel(PerformanceUpdate.name) private updates:Model<any>,
  ) {}

  async catalog() {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    const monthStart = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
    const nextMonth = new Date(now.getFullYear(), now.getMonth()+1, 1);
    const monthEndDate = new Date(nextMonth.getTime()-86400000);
    const monthEnd = `${monthEndDate.getFullYear()}-${String(monthEndDate.getMonth()+1).padStart(2,'0')}-${String(monthEndDate.getDate()).padStart(2,'0')}`;
    const [income, expense, stockItems, tasks, failed, pending] = await Promise.all([
      this.finance.find({direction:'Income',date:{$gte:new Date(`${monthStart}T00:00:00.000Z`),$lt:new Date(`${nextMonth.toISOString().slice(0,10)}T00:00:00.000Z`)}}).select('amountUgx').limit(10000).lean(),
      this.finance.find({direction:'Expense',date:{$gte:new Date(`${monthStart}T00:00:00.000Z`),$lt:new Date(`${nextMonth.toISOString().slice(0,10)}T00:00:00.000Z`)}}).select('amountUgx').limit(10000).lean(),
      this.stock.find().select('quantityOnHand reorderLevel averageUnitCostUgx').limit(10000).lean(),
      this.tasks.find().select('plannedDate status').limit(10000).lean(),
      this.workflows.countDocuments({status:'failed'}),
      this.workflows.countDocuments({status:'pending'}),
    ]);
    const sum = (rows:any[]) => rows.reduce((s,r)=>s+Number(r.amountUgx||0),0);
    const metrics:Metric[] = [
      {key:'finance_income_month_ugx',title:'Recorded income this month',unit:'UGX',value:sum(income),source:'Finance transactions',periodStart:monthStart,periodEnd:monthEnd,caveat:'Recorded entries only; not reconciled cash or audited revenue.'},
      {key:'finance_expense_month_ugx',title:'Recorded expenses this month',unit:'UGX',value:sum(expense),source:'Finance transactions',periodStart:monthStart,periodEnd:monthEnd,caveat:'Recorded entries only; may omit unentered costs.'},
      {key:'inventory_item_count',title:'Registered stock items',unit:'count',value:stockItems.length,source:'Central inventory',periodStart:today,periodEnd:today,caveat:'Counts item records, not units on hand.'},
      {key:'inventory_low_stock_count',title:'Stock items at/below reorder level',unit:'count',value:stockItems.filter((x:any)=>Number(x.quantityOnHand||0)<=Number(x.reorderLevel||0)).length,source:'Central inventory',periodStart:today,periodEnd:today,caveat:'Based on recorded quantities and reorder levels.'},
      {key:'inventory_estimated_value_ugx',title:'Estimated stock value at average cost',unit:'UGX',value:Math.round(stockItems.reduce((s:number,x:any)=>s+Number(x.quantityOnHand||0)*Number(x.averageUnitCostUgx||0),0)),source:'Central inventory',periodStart:today,periodEnd:today,caveat:'Management estimate, not a verified accounting valuation.'},
      {key:'workforce_task_count',title:'Registered labour tasks',unit:'count',value:tasks.length,source:'Workforce tasks',periodStart:today,periodEnd:today,caveat:'All registered tasks in the bounded dataset.'},
      {key:'workforce_completed_task_count',title:'Verified completed labour tasks',unit:'count',value:tasks.filter((x:any)=>x.status==='verified').length,source:'Workforce tasks',periodStart:today,periodEnd:today,caveat:'Only tasks with status verified are counted as completed.'},
      {key:'workforce_overdue_task_count',title:'Overdue open labour tasks',unit:'count',value:tasks.filter((x:any)=>String(x.plannedDate||'')<today&&!['verified','cancelled'].includes(x.status)).length,source:'Workforce tasks',periodStart:today,periodEnd:today,caveat:'Uses planned date and current status; confirm task records are up to date.'},
      {key:'workflow_failed_count',title:'Failed workflow events',unit:'count',value:failed,source:'Integration workflow queue',periodStart:today,periodEnd:today,caveat:'Current queue count, not a period-specific failure rate.'},
      {key:'workflow_pending_count',title:'Pending workflow events',unit:'count',value:pending,source:'Integration workflow queue',periodStart:today,periodEnd:today,caveat:'Current queue count, not a measure of throughput.'},
    ];
    return {generatedAt:now.toISOString(),metrics,limits:{financeRecordsRead:'up to 10,000 matching entries per direction',stockItemsRead:'up to 10,000',workforceTasksRead:'up to 10,000',workflowCounts:'database counts'},notice:'Suggested actuals are read-only until an owner explicitly applies a metric to a target. Verify the metric, unit, date window and evidence before applying.'};
  }

  async applyMetric(body:any, actor:string) {
    const targetId=String(body?.targetId||'');
    const metricKey=String(body?.metricKey||'');
    const updateDate=String(body?.updateDate||'');
    if(!targetId||!metricKey) throw new BadRequestException('targetId and metricKey are required');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(updateDate)||Number.isNaN(Date.parse(updateDate))) throw new BadRequestException('updateDate must be YYYY-MM-DD');
    const target=await this.targets.findById(targetId);
    if(!target) throw new NotFoundException('Performance target not found');
    if(updateDate<target.periodStart||updateDate>target.periodEnd) throw new BadRequestException('Update date must fall within the target period');
    const catalog:any=await this.catalog();
    const metric:Metric|undefined=catalog.metrics.find((m:Metric)=>m.key===metricKey);
    if(!metric) throw new BadRequestException('Unsupported metric key');
    if(metric.unit!==target.unit) throw new BadRequestException(`Unit mismatch: target uses ${target.unit}, metric uses ${metric.unit}`);
    if(updateDate<metric.periodStart||updateDate>metric.periodEnd) throw new BadRequestException(`Selected update date must fall within this metric window (${metric.periodStart} to ${metric.periodEnd})`);
    const explanation=String(body?.explanation||'').slice(0,1000);
    const evidenceReference=`ForestOS suggested metric: ${metric.key}; source=${metric.source}; generated=${catalog.generatedAt}`;
    return this.updates.create({targetId:String(target._id),updateDate,actualValue:metric.value,evidenceReference,explanation:explanation||`Owner-confirmed metric application: ${metric.title}. Caveat: ${metric.caveat}`,recordedBy:actor});
  }
}

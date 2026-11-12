import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinanceTransaction } from '../finance/finance.schema';
import { SalesOrder } from '../sales/sales.schema';
import { InventoryItem } from '../inventory/inventory.schema';
import { FieldTask } from '../tasks/tasks.schema';
import { Inspection } from '../inspections/inspection.schema';
import { Evidence } from '../evidence/evidence.schema';
import {
  OrganizationContext,
  requireOrganizationContext,
} from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(FinanceTransaction.name) private finance: Model<FinanceTransaction>,
    @InjectModel(SalesOrder.name) private sales: Model<SalesOrder>,
    @InjectModel(InventoryItem.name) private inventory: Model<InventoryItem>,
    @InjectModel(FieldTask.name) private tasks: Model<FieldTask>,
    @InjectModel(Inspection.name) private inspections: Model<Inspection>,
    @InjectModel(Evidence.name) private evidence: Model<Evidence>,
  ) {}

  async summary(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const filter = organizationFilter(context);

    console.log('org filter:', JSON.stringify(filter));

    const [transactions, orders, items, tasks, inspections, evidenceCount] = await Promise.all([
      // Scoped — these schemas already have organizationId
      this.finance.find(filter).lean(),
      this.sales.find(filter).lean(),
      this.inventory.find(filter).lean(),

      // ⚠️ TEMPORARY — these schemas do not yet have organizationId.
      // After adding the field + backfilling + scoping their services,
      // change these three lines to use `filter`:
      //   this.tasks.find(filter).lean(),
      //   this.inspections.find(filter).lean(),
      //   this.evidence.countDocuments(filter),
      this.tasks.find().lean(),
      this.inspections.find().lean(),
      this.evidence.countDocuments(filter),
    ]);

    const income = transactions.filter(x => x.direction === 'Income').reduce((s, x) => s + Number(x.amountUgx || 0), 0);
    const expenses = transactions.filter(x => x.direction === 'Expense').reduce((s, x) => s + Number(x.amountUgx || 0), 0);
    const transfers = transactions.filter(x => x.direction === 'Transfer').reduce((s, x) => s + Number(x.amountUgx || 0), 0);
    const salesValue = orders.filter(x => x.status !== 'Cancelled').reduce((s, x) => s + Number(x.quantity || 0) * Number(x.unitPriceUgx || 0), 0);
    const salesPaid = orders.filter(x => x.status !== 'Cancelled').reduce((s, x) => s + Number(x.amountPaidUgx || 0), 0);
    const outstanding = Math.max(0, salesValue - salesPaid);
    const lowStock = items.filter(x => Number(x.openingStock || 0) + Number(x.received || 0) - Number(x.used || 0) <= Number(x.reorderLevel || 0)).length;
    const openTasks = tasks.filter(x => !['Completed', 'Cancelled'].includes(x.status)).length;
    const overdueTasks = tasks.filter(x => !['Completed', 'Cancelled'].includes(x.status) && x.dueDate && new Date(x.dueDate) < new Date()).length;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const sevenDays = new Date(today); sevenDays.setDate(sevenDays.getDate() + 7);
    const openInspections = inspections.filter((x: any) => x.status !== 'Completed');
    const overdueInspections = openInspections.filter((x: any) => new Date(x.dueDate) < today);
    const dueSoonInspections = openInspections.filter((x: any) => new Date(x.dueDate) >= today && new Date(x.dueDate) <= sevenDays);
    const highRiskInspections = openInspections.filter((x: any) => ['High', 'Critical'].includes(x.priority));
    const monthly: Record<string, { incomeUgx: number; expensesUgx: number; netUgx: number }> = {};
    for (const tx of transactions as any[]) {
      const date = new Date(tx.date); if (Number.isNaN(date.getTime())) continue;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthly[key]) monthly[key] = { incomeUgx: 0, expensesUgx: 0, netUgx: 0 };
      if (tx.direction === 'Income') monthly[key].incomeUgx += Number(tx.amountUgx || 0);
      if (tx.direction === 'Expense') monthly[key].expensesUgx += Number(tx.amountUgx || 0);
    }
    Object.values(monthly).forEach(v => v.netUgx = v.incomeUgx - v.expensesUgx);
    const byLine: Record<string, { income: number; expenses: number; net: number }> = {};
    for (const tx of transactions) {
      const line = tx.businessLine || 'Unclassified';
      if (!byLine[line]) byLine[line] = { income: 0, expenses: 0, net: 0 };
      if (tx.direction === 'Income') byLine[line].income += Number(tx.amountUgx || 0);
      if (tx.direction === 'Expense') byLine[line].expenses += Number(tx.amountUgx || 0);
    }
    Object.values(byLine).forEach(v => v.net = v.income - v.expenses);
    return {
      generatedAt: new Date().toISOString(),
      finance: { recordedIncomeUgx: income, recordedExpensesUgx: expenses, operatingNetUgx: income - expenses, transfersUgx: transfers },
      sales: { orderValueUgx: salesValue, amountPaidUgx: salesPaid, outstandingUgx: outstanding, orderCount: orders.length },
      operations: { inventoryItems: items.length, lowStockItems: lowStock, openTasks, overdueTasks },
      inspections: { total: inspections.length, open: openInspections.length, overdue: overdueInspections.length, dueWithin7Days: dueSoonInspections.length, highOrCriticalOpen: highRiskInspections.length, evidenceCount },
      monthlyFinancialTrend: Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([month, values]) => ({ month, ...values })),
      attentionItems: [
        ...overdueInspections.slice(0, 10).map((x: any) => ({ type: 'Overdue inspection', priority: 'High', title: x.title, siteOrBlock: x.siteOrBlock, dueDate: x.dueDate, status: x.status })),
        ...highRiskInspections.slice(0, 10).map((x: any) => ({ type: 'High-risk inspection', priority: x.priority, title: x.title, siteOrBlock: x.siteOrBlock, dueDate: x.dueDate, status: x.status })),
        ...tasks.filter((x: any) => !['Completed', 'Cancelled'].includes(x.status) && x.dueDate && new Date(x.dueDate) < today).slice(0, 10).map((x: any) => ({ type: 'Overdue task', priority: 'Medium', title: x.title || x.taskName || 'Field task', siteOrBlock: x.siteOrBlock || '', dueDate: x.dueDate, status: x.status })),
      ].slice(0, 20),
      performanceByBusinessLine: byLine,
      warnings: [
        'Cash balance is not calculated from transactions alone until opening balances and transfers are reconciled.',
        'Sales order value and finance income are separate views; do not add them together.',
        'This dashboard summarizes recorded data and may be incomplete if transactions are missing.',
      ],
    };
  }
}





// import { Injectable } from '@nestjs/common';
// import { InjectModel } from '@nestjs/mongoose';
// import { Model } from 'mongoose';
// import { FinanceTransaction } from '../finance/finance.schema';
// import { SalesOrder } from '../sales/sales.schema';
// import { InventoryItem } from '../inventory/inventory.schema';
// import { FieldTask } from '../tasks/tasks.schema';
// import { Inspection } from '../inspections/inspection.schema';
// import { Evidence } from '../evidence/evidence.schema';

// @Injectable()
// export class DashboardService {
//   constructor(
//     @InjectModel(FinanceTransaction.name) private finance: Model<FinanceTransaction>,
//     @InjectModel(SalesOrder.name) private sales: Model<SalesOrder>,
//     @InjectModel(InventoryItem.name) private inventory: Model<InventoryItem>,
//     @InjectModel(FieldTask.name) private tasks: Model<FieldTask>,
//     @InjectModel(Inspection.name) private inspections: Model<Inspection>,
//     @InjectModel(Evidence.name) private evidence: Model<Evidence>,
//   ) {}
//   async summary() {
//     const [transactions, orders, items, tasks, inspections, evidenceCount] = await Promise.all([
//       this.finance.find().lean(),
//       this.sales.find().lean(),
//       this.inventory.find().lean(),
//       this.tasks.find().lean(),
//       this.inspections.find().lean(),
//       this.evidence.countDocuments(),
//     ]);
//     const income = transactions.filter(x => x.direction === 'Income').reduce((s,x) => s + Number(x.amountUgx || 0), 0);
//     const expenses = transactions.filter(x => x.direction === 'Expense').reduce((s,x) => s + Number(x.amountUgx || 0), 0);
//     const transfers = transactions.filter(x => x.direction === 'Transfer').reduce((s,x) => s + Number(x.amountUgx || 0), 0);
//     const salesValue = orders.filter(x => x.status !== 'Cancelled').reduce((s,x) => s + Number(x.quantity || 0) * Number(x.unitPriceUgx || 0), 0);
//     const salesPaid = orders.filter(x => x.status !== 'Cancelled').reduce((s,x) => s + Number(x.amountPaidUgx || 0), 0);
//     const outstanding = Math.max(0, salesValue - salesPaid);
//     const lowStock = items.filter(x => Number(x.openingStock || 0) + Number(x.received || 0) - Number(x.used || 0) <= Number(x.reorderLevel || 0)).length;
//     const openTasks = tasks.filter(x => !['Completed','Cancelled'].includes(x.status)).length;
//     const overdueTasks = tasks.filter(x => !['Completed','Cancelled'].includes(x.status) && x.dueDate && new Date(x.dueDate) < new Date()).length;
//     const today=new Date(); today.setHours(0,0,0,0);
//     const sevenDays=new Date(today); sevenDays.setDate(sevenDays.getDate()+7);
//     const openInspections=inspections.filter((x:any)=>x.status!=='Completed');
//     const overdueInspections=openInspections.filter((x:any)=>new Date(x.dueDate)<today);
//     const dueSoonInspections=openInspections.filter((x:any)=>new Date(x.dueDate)>=today&&new Date(x.dueDate)<=sevenDays);
//     const highRiskInspections=openInspections.filter((x:any)=>['High','Critical'].includes(x.priority));
//     const monthly:Record<string,{incomeUgx:number;expensesUgx:number;netUgx:number}>={};
//     for(const tx of transactions as any[]){
//       const date=new Date(tx.date); if(Number.isNaN(date.getTime())) continue;
//       const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`;
//       if(!monthly[key])monthly[key]={incomeUgx:0,expensesUgx:0,netUgx:0};
//       if(tx.direction==='Income')monthly[key].incomeUgx+=Number(tx.amountUgx||0);
//       if(tx.direction==='Expense')monthly[key].expensesUgx+=Number(tx.amountUgx||0);
//     }
//     Object.values(monthly).forEach(v=>v.netUgx=v.incomeUgx-v.expensesUgx);
//     const byLine: Record<string,{income:number;expenses:number;net:number}> = {};
//     for (const tx of transactions) {
//       const line = tx.businessLine || 'Unclassified';
//       if (!byLine[line]) byLine[line] = {income:0,expenses:0,net:0};
//       if (tx.direction === 'Income') byLine[line].income += Number(tx.amountUgx || 0);
//       if (tx.direction === 'Expense') byLine[line].expenses += Number(tx.amountUgx || 0);
//     }
//     Object.values(byLine).forEach(v => v.net = v.income - v.expenses);
//     return {
//       generatedAt: new Date().toISOString(),
//       finance: { recordedIncomeUgx: income, recordedExpensesUgx: expenses, operatingNetUgx: income - expenses, transfersUgx: transfers },
//       sales: { orderValueUgx: salesValue, amountPaidUgx: salesPaid, outstandingUgx: outstanding, orderCount: orders.length },
//       operations: { inventoryItems: items.length, lowStockItems: lowStock, openTasks, overdueTasks },
//       inspections: { total: inspections.length, open: openInspections.length, overdue: overdueInspections.length, dueWithin7Days: dueSoonInspections.length, highOrCriticalOpen: highRiskInspections.length, evidenceCount },
//       monthlyFinancialTrend: Object.entries(monthly).sort(([a],[b])=>a.localeCompare(b)).slice(-12).map(([month,values])=>({month,...values})),
//       attentionItems: [
//         ...overdueInspections.slice(0,10).map((x:any)=>({type:'Overdue inspection',priority:'High',title:x.title,siteOrBlock:x.siteOrBlock,dueDate:x.dueDate,status:x.status})),
//         ...highRiskInspections.slice(0,10).map((x:any)=>({type:'High-risk inspection',priority:x.priority,title:x.title,siteOrBlock:x.siteOrBlock,dueDate:x.dueDate,status:x.status})),
//         ...tasks.filter((x:any)=>!['Completed','Cancelled'].includes(x.status)&&x.dueDate&&new Date(x.dueDate)<today).slice(0,10).map((x:any)=>({type:'Overdue task',priority:'Medium',title:x.title||x.taskName||'Field task',siteOrBlock:x.siteOrBlock||'',dueDate:x.dueDate,status:x.status}))
//       ].slice(0,20),
//       performanceByBusinessLine: byLine,
//       warnings: [
//         'Cash balance is not calculated from transactions alone until opening balances and transfers are reconciled.',
//         'Sales order value and finance income are separate views; do not add them together.',
//         'This dashboard summarizes recorded data and may be incomplete if transactions are missing.',
//       ],
//     };
//   }
// }

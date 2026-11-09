import {Injectable} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {FinanceTransaction} from '../finance/finance.schema';
import {StockItem,StockMovement} from '../inventory-control/inventory.schema';
import {WorkflowEvent} from '../integration-workflows/workflow-event.schema';
import {Inspection} from '../inspections/inspection.schema';
import {FarmRisk} from '../risk-management/risk.schema';
import {LabourTask} from '../workforce/workforce.schema';

@Injectable()
export class DataIntegrityService {
 constructor(
  @InjectModel(FinanceTransaction.name) private finance:Model<any>,
  @InjectModel(StockItem.name) private stock:Model<any>,
  @InjectModel(StockMovement.name) private movements:Model<any>,
  @InjectModel(WorkflowEvent.name) private workflows:Model<any>,
  @InjectModel(Inspection.name) private inspections:Model<any>,
  @InjectModel(FarmRisk.name) private risks:Model<any>,
  @InjectModel(LabourTask.name) private tasks:Model<any>,
 ){}
 async report(){
  const [finance,items,moves,workflows,inspections,risks,tasks]=await Promise.all([
   this.finance.find().sort({date:-1}).limit(5000).lean(),
   this.stock.find().lean(),this.movements.find().sort({createdAt:-1}).limit(10000).lean(),
   this.workflows.find().sort({createdAt:-1}).limit(3000).lean(),
   this.inspections.find().sort({dueDate:1}).limit(3000).lean(),
   this.risks.find().sort({createdAt:-1}).limit(3000).lean(),
   this.tasks.find().sort({plannedDate:1}).limit(3000).lean()
  ]);
  const issues:any[]=[];
  const add=(severity:string,area:string,code:string,title:string,detail:string,action:string,recordId='')=>issues.push({severity,area,code,title,detail,action,recordId});
  const seenFinance=new Map<string,any>();
  for(const t of finance){
   const amount=Number(t.amountUgx);
   if(!Number.isFinite(amount)||amount<0)add('high','Finance','FIN_AMOUNT_INVALID',`Invalid amount on ${t.transactionId}`,`amountUgx=${t.amountUgx}`,'Review the source document and correct the transaction.',String(t._id));
   if(!['Income','Expense','Transfer'].includes(String(t.direction)))add('high','Finance','FIN_DIRECTION_INVALID',`Invalid transaction direction: ${t.transactionId}`,String(t.direction),'Use an allowed transaction direction.',String(t._id));
   const ref=String(t.transactionId||'').trim();
   if(!ref)add('high','Finance','FIN_ID_MISSING','Finance transaction has no transaction ID','A transaction identifier is missing.','Assign a unique transaction ID.',String(t._id));
   else if(seenFinance.has(ref))add('high','Finance','FIN_ID_DUPLICATE',`Duplicate transaction ID: ${ref}`,'Multiple finance records use the same transaction ID.','Review both records before changing or deleting either.',String(t._id));
   else seenFinance.set(ref,t._id);
   if(!t.reconciled)add('medium','Finance','FIN_UNRECONCILED',`Unreconciled transaction: ${ref||String(t._id)}`,'Transaction is not marked reconciled.','Compare it with bank, mobile-money, cash, and supporting records.',String(t._id));
  }
  const itemById=new Map(items.map((i:any)=>[String(i._id),i]));
  const itemCodes=new Map<string,number>();
  for(const i of items){
   const code=String(i.itemCode||'').trim();
   itemCodes.set(code,(itemCodes.get(code)||0)+1);
   if(Number(i.quantityOnHand)<0||!Number.isFinite(Number(i.quantityOnHand)))add('high','Inventory','STOCK_QTY_INVALID',`Invalid on-hand quantity: ${i.name||code}`,String(i.quantityOnHand),'Physically count stock and reconcile movements.',String(i._id));
   if(Number(i.averageUnitCostUgx)<0||!Number.isFinite(Number(i.averageUnitCostUgx)))add('high','Inventory','STOCK_COST_INVALID',`Invalid unit cost: ${i.name||code}`,String(i.averageUnitCostUgx),'Verify the cost basis and correct the stock record.',String(i._id));
   if(Number(i.quantityOnHand)<=Number(i.reorderLevel))add('medium','Inventory','STOCK_LOW',`Low stock: ${i.name||code}`,`On hand ${i.quantityOnHand}; reorder level ${i.reorderLevel}.`,'Verify physical quantity and assess replenishment.',String(i._id));
  }
  for(const [code,count] of itemCodes)if(code&&count>1)add('high','Inventory','STOCK_CODE_DUPLICATE',`Duplicate stock item code: ${code}`,`${count} items share this code.`,'Check item identities before merging or editing records.');
  const movementCodes=new Map<string,number>();
  const movementByItem=new Map<string,any[]>();
  for(const m of moves){
   const code=String(m.movementCode||'').trim();movementCodes.set(code,(movementCodes.get(code)||0)+1);
   const key=String(m.itemId);if(!movementByItem.has(key))movementByItem.set(key,[]);movementByItem.get(key)!.push(m);
   if(!itemById.has(key))add('high','Inventory','MOVEMENT_ORPHAN',`Movement references missing stock item: ${code}`,`itemId=${key}`,'Investigate the movement and restore or correct the stock-item reference.',String(m._id));
   if(!Number.isFinite(Number(m.quantity))||Number(m.quantity)<=0)add('high','Inventory','MOVEMENT_QTY_INVALID',`Invalid movement quantity: ${code}`,String(m.quantity),'Verify the source record before correcting this movement.',String(m._id));
  }
  for(const [code,count] of movementCodes)if(code&&count>1)add('high','Inventory','MOVEMENT_CODE_DUPLICATE',`Duplicate movement code: ${code}`,`${count} movements use the same code.`,'Review all matching movements; do not delete records until stock balances are reconciled.');
  for(const i of items){
   const arr=movementByItem.get(String(i._id))||[];
   if(arr.length){
    const latest=arr.slice().sort((a:any,b:any)=>new Date(b.createdAt||b.movementDate).getTime()-new Date(a.createdAt||a.movementDate).getTime())[0];
    if(Number.isFinite(Number(latest.balanceAfter))&&Math.abs(Number(latest.balanceAfter)-Number(i.quantityOnHand))>0.0001)
     add('medium','Inventory','STOCK_BALANCE_MISMATCH',`Item balance differs from latest recorded movement: ${i.name}`,`Item quantity=${i.quantityOnHand}; latest movement balance=${latest.balanceAfter}.`,'Review the full movement history and physical count before making an adjustment.',String(i._id));
   }
  }
  for(const w of workflows){
   if(w.status==='processed'){
    const exists=moves.some((m:any)=>String(m.movementCode)===String(w.eventCode));
    if(!exists)add('high','Integration','WORKFLOW_MOVEMENT_MISSING',`Processed workflow has no matching movement: ${w.eventCode}`,'Workflow says processed but no movement with its event code was found.','Review workflow history and stock movement ledger before reprocessing.',String(w._id));
   }
   if(w.status==='failed')add('high','Integration','WORKFLOW_FAILED',`Failed workflow: ${w.eventCode}`,String(w.errorMessage||'No error details recorded'),'Review the source document and current stock balance before retrying.',String(w._id));
  }
  for(const i of inspections){
   if(!i.title||!i.assignedTo)add('medium','Inspections','INSPECTION_FIELDS_MISSING',`Inspection missing title or assignee: ${i.inspectionId||i._id}`,'Required management fields are blank or missing.','Assign a clear title and responsible person.',String(i._id));
  }
  for(const r of risks){
   const likelihood=Number(r.likelihood),impact=Number(r.impact);
   if(likelihood<1||likelihood>5||impact<1||impact>5)add('high','Risk','RISK_SCORE_INVALID',`Risk score out of range: ${r.riskCode||r.title}`,`Likelihood=${r.likelihood}; impact=${r.impact}`,'Reassess likelihood and impact using the defined 1–5 scale.',String(r._id));
  }
  for(const t of tasks){
   if(!t.taskCode||!t.title||!t.plannedDate)add('medium','Workforce','TASK_FIELDS_MISSING',`Task has incomplete details: ${t.taskCode||t._id}`,'Task code, title, or planned date is missing.','Complete the task record and confirm its assigned worker.',String(t._id));
  }
  const counts={high:issues.filter(i=>i.severity==='high').length,medium:issues.filter(i=>i.severity==='medium').length,low:issues.filter(i=>i.severity==='low').length};
  const integrityRank: Record<string, number> = { high: 0, medium: 1, low: 2 };
  return {generatedAt:new Date().toISOString(),note:'Read-only integrity scan. It reports potential inconsistencies; it does not edit, delete, reconcile, or automatically repair source records.',scope:{financeRecords:finance.length,stockItems:items.length,stockMovements:moves.length,workflowEvents:workflows.length,inspections:inspections.length,risks:risks.length,labourTasks:tasks.length},counts,totalIssues:issues.length,issues: issues.slice().sort((a: any, b: any) => (integrityRank[a.severity] ?? 99) - (integrityRank[b.severity] ?? 99)).slice(0, 500) };
 }
}

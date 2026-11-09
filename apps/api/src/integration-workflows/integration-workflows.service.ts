import {BadRequestException,Injectable,NotFoundException,ConflictException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {WorkflowEvent,WorkflowEventDocument} from './workflow-event.schema';
import {InventoryControlService} from '../inventory-control/inventory-control.service';
import { OrganizationContext } from '../organizations/organization-context';    

const eventTypes=['procurement_receipt','maintenance_parts_issue','nursery_stock_receipt','nursery_dispatch','manual_adjustment'];
const allowedMovementTypes=['receipt','issue','adjustment_increase','adjustment_decrease','write_off'];
function positive(v:any,label:string,min=0.001){const n=Number(v);if(!Number.isFinite(n)||n<min)throw new BadRequestException(`${label} must be >= ${min}`);return n;}
function validDate(v:any){if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||Number.isNaN(Date.parse(v)))throw new BadRequestException('movementDate must be YYYY-MM-DD');return v;}
function eventCode(){return `WF-${Date.now()}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;}
@Injectable()
export class IntegrationWorkflowsService{
 constructor(@InjectModel(WorkflowEvent.name)private events:Model<WorkflowEventDocument>,private inventory:InventoryControlService){}
 async dashboard(){
  const [pending,processing,processed,failed,cancelled,recent]=await Promise.all([
   this.events.countDocuments({status:'pending'}),this.events.countDocuments({status:'processing'}),
   this.events.countDocuments({status:'processed'}),this.events.countDocuments({status:'failed'}),
   this.events.countDocuments({status:'cancelled'}),this.events.find().sort({createdAt:-1}).limit(10).lean()
  ]);
  return {totals:{pending,processing,processed,failed,cancelled,total:pending+processing+processed+failed+cancelled},recent};
 }
 async list(q:any={}){const f:any={};if(q.status&&['pending','processing','processed','failed','cancelled'].includes(q.status))f.status=q.status;return this.events.find(f).sort({createdAt:-1}).limit(300).lean();}
 async create(b:any,actor=''){
  if(!eventTypes.includes(b?.eventType))throw new BadRequestException('Invalid eventType');
  if(!b?.stockItemId)throw new BadRequestException('stockItemId is required');
  const quantity=positive(b.quantity,'quantity');
  const movementDate=validDate(b.movementDate);
  let movementType:string;
  if(b.eventType==='procurement_receipt'||b.eventType==='nursery_stock_receipt')movementType='receipt';
  else if(b.eventType==='maintenance_parts_issue'||b.eventType==='nursery_dispatch')movementType='issue';
  else {movementType=b.movementType;if(!allowedMovementTypes.includes(movementType))throw new BadRequestException('Choose a valid movementType for a manual adjustment');}
  if(['receipt','adjustment_increase'].includes(movementType)) positive(b.unitCostUgx??0,'unitCostUgx',0);
  const itemList = await this.inventory.listItems({} as any);
  const item=itemList.find((x:any)=>String(x._id)===String(b.stockItemId));
  if(!item)throw new NotFoundException('Stock item not found');
  const event=await this.events.create({
   eventCode:eventCode(),eventType:b.eventType,sourceModule:String(b.sourceModule||b.eventType).slice(0,80),
   sourceRecordId:String(b.sourceRecordId||'').slice(0,120),sourceReference:String(b.sourceReference||'').slice(0,120),
   stockItemId:String(b.stockItemId),quantity,movementType,unitCostUgx:positive(b.unitCostUgx??item.averageUnitCostUgx,'unitCostUgx',0),
   movementDate,reason:String(b.reason||'').slice(0,500),status:'pending',createdBy:actor
  });
  return event;
 }
 async process(rawContext: OrganizationContext, id:string,actor=''){
  const current=await this.events.findById(id);
  if(!current)throw new NotFoundException('Workflow event not found');
  if(current.status==='processed')return current;
  if(current.status==='cancelled')throw new ConflictException('Cancelled events cannot be processed');
  if(current.status==='processing')throw new ConflictException('This event is already being processed');
  const claimed=await this.events.findOneAndUpdate({_id:id,status:{$in:['pending','failed']}},{$set:{status:'processing',errorMessage:''}},{new:true});
  if(!claimed)throw new ConflictException('Event status changed; refresh and try again');
  try{
   // A retry after a partial failure checks for the event code before posting stock a second time.
   const existing = await this.inventory.findMovementByCode(rawContext, claimed.eventCode);
   if(existing){
    claimed.status='processed';claimed.resultNote=`Existing stock movement ${claimed.eventCode} found; duplicate posting prevented.`;
   }else{
    const movement = await this.inventory.postMovement(
  rawContext,
  {
    itemId: claimed.stockItemId,
    movementCode: claimed.eventCode,
    movementType: claimed.movementType,
    movementDate: claimed.movementDate,
    quantity: claimed.quantity,
    unitCostUgx: claimed.unitCostUgx,
    referenceType: claimed.sourceModule,
    referenceCode: claimed.sourceReference || claimed.sourceRecordId || claimed.eventCode,
    reason: claimed.reason || `Workflow event ${claimed.eventCode}`,
  },
  actor,
);
    claimed.status='processed';claimed.resultNote=`Stock movement ${movement.movementCode} posted.`;
   }
   claimed.processedBy=actor;claimed.processedAt=new Date();claimed.errorMessage='';await claimed.save();return claimed;
  }catch(e:any){
   claimed.status='failed';claimed.errorMessage=String(e?.message||'Processing failed').slice(0,1000);await claimed.save();throw e;
  }
 }
 async cancel(id:string,actor=''){
  const ev=await this.events.findById(id);if(!ev)throw new NotFoundException('Workflow event not found');
  if(ev.status==='processed'||ev.status==='processing')throw new ConflictException('Processed or processing events cannot be cancelled');
  if(ev.status==='cancelled')return ev;
  ev.status='cancelled';ev.resultNote=`Cancelled by ${actor||'owner'}`;return ev.save();
 }
}

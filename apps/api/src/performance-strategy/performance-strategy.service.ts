import {BadRequestException,Injectable,NotFoundException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {PerformanceTarget,PerformanceTargetDocument,PerformanceUpdate,PerformanceUpdateDocument} from './performance.schema';
const areas=['Forestry','Beekeeping','Finance','Workforce','Operations','Whole farm'];
const units=['count','percent','UGX','hours','kg','litres','trees','hives','colonies','days','other'];
const directions=['higher','lower','exact'];
function validDate(v:any,label:string){if(typeof v!=='string'||!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(v)||Number.isNaN(Date.parse(v)))throw new BadRequestException(`${label} must be YYYY-MM-DD`);return v;}
function num(v:any,label:string){const n=Number(v);if(!Number.isFinite(n)||n<0)throw new BadRequestException(`${label} must be a non-negative number`);return n;}
@Injectable()
export class PerformanceStrategyService{
 constructor(@InjectModel(PerformanceTarget.name)private targets:Model<PerformanceTargetDocument>,@InjectModel(PerformanceUpdate.name)private updates:Model<PerformanceUpdateDocument>){}
 private progress(t:any,latest:any){
  const actual=latest?Number(latest.actualValue):Number(t.baseline||0),target=Number(t.targetValue||0),base=Number(t.baseline||0);
  let pct=0;
  if(t.direction==='higher')pct=target===base?(actual>=target?100:0):(actual-base)/(target-base)*100;
  else if(t.direction==='lower')pct=target===base?(actual<=target?100:0):(base-actual)/(base-target)*100;
  else pct=target===0?(actual===0?100:0):Math.max(0,100-Math.abs(actual-target)/Math.max(Math.abs(target),1)*100);
  pct=Math.max(0,Math.min(100,pct));
  const achieved=t.direction==='higher'?actual>=target:t.direction==='lower'?actual<=target:actual===target;
  const start=new Date(t.periodStart),end=new Date(t.periodEnd),now=new Date();
  const elapsed=end<=start?1:Math.max(0,Math.min(1,(Math.min(now.getTime(),end.getTime())-start.getTime())/(end.getTime()-start.getTime())));
  const missed=!achieved&&now>end;
  return {...t,latestActual:actual,latestUpdateDate:latest?.updateDate||null,progressPct:Math.round(pct),achieved,onTrack:achieved||pct>=elapsed*100-10,statusComputed:achieved?'achieved':missed?'missed':pct>=elapsed*100-10?'on_track':'at_risk'};
 }
 async dashboard(){
  const [targets,updates]=await Promise.all([this.targets.find().sort({periodEnd:1,createdAt:-1}).limit(1000).lean(),this.updates.find().sort({updateDate:-1,createdAt:-1}).limit(5000).lean()]);
  const latestById=new Map<string,any>();for(const u of updates){const id=String(u.targetId);if(!latestById.has(id))latestById.set(id,u);}
  const rows=targets.map(t=>this.progress(t,latestById.get(String(t._id))));
  return {generatedAt:new Date().toISOString(),totals:{targets:rows.length,active:rows.filter(t=>t.status==='active').length,achieved:rows.filter(t=>t.statusComputed==='achieved').length,atRisk:rows.filter(t=>t.statusComputed==='at_risk').length,missed:rows.filter(t=>t.statusComputed==='missed').length},targets:rows,recentUpdates:updates.slice(0,30)};
 }
 async create(b:any,actor=''){
  if(!String(b?.targetCode||'').trim()||!String(b?.title||'').trim())throw new BadRequestException('targetCode and title are required');
  if(!areas.includes(b.area)||!units.includes(b.unit)||!directions.includes(b.direction))throw new BadRequestException('Choose valid area, unit, and direction');
  const start=validDate(b.periodStart,'periodStart'),end=validDate(b.periodEnd,'periodEnd');if(end<start)throw new BadRequestException('periodEnd must be on or after periodStart');
  return this.targets.create({targetCode:String(b.targetCode).trim(),title:String(b.title).trim(),area:b.area,unit:b.unit,baseline:num(b.baseline,'baseline'),targetValue:num(b.targetValue,'targetValue'),periodStart:start,periodEnd:end,direction:b.direction,sourceOrMethod:String(b.sourceOrMethod||'').slice(0,500),ownerResponsible:String(b.ownerResponsible||'').slice(0,160),status:b.status==='active'?'active':'draft',notes:String(b.notes||'').slice(0,1000),createdBy:actor});
 }
 async update(id:string,b:any){
  const t=await this.targets.findById(id);if(!t)throw new NotFoundException('Target not found');
  if(b.status!==undefined){if(!['draft','active','achieved','at_risk','missed','cancelled'].includes(b.status))throw new BadRequestException('Invalid target status');t.status=b.status;}
  for(const k of ['title','ownerResponsible','sourceOrMethod','notes'] as const)if(b[k]!==undefined)(t as any)[k]=String(b[k]).slice(0,1000);
  return t.save();
 }
 async addUpdate(id:string,b:any,actor=''){
  const t=await this.targets.findById(id);if(!t)throw new NotFoundException('Target not found');
  const updateDate=validDate(b?.updateDate,'updateDate');if(updateDate<t.periodStart||updateDate>t.periodEnd)throw new BadRequestException('Update date must fall within the target period');
  return this.updates.create({targetId:String(t._id),updateDate,actualValue:num(b.actualValue,'actualValue'),evidenceReference:String(b.evidenceReference||'').slice(0,250),explanation:String(b.explanation||'').slice(0,1000),recordedBy:actor});
 }
 async history(id:string){if(!await this.targets.exists({_id:id}))throw new NotFoundException('Target not found');return this.updates.find({targetId:id}).sort({updateDate:-1,createdAt:-1}).limit(500).lean();}
}

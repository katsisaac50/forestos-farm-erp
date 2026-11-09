import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FarmAsset,FarmAssetDocument,MaintenanceRecord,MaintenanceRecordDocument,SparePart,SparePartDocument } from './maintenance.schema';
const assetTypes=['hand_tool','power_tool','vehicle','water_system','apiary_equipment','safety_equipment','building','other'];
const assetStatuses=['active','needs_repair','under_maintenance','retired','lost'];
const maintenanceTypes=['preventive','repair','inspection','calibration','cleaning','other'];
const maintenanceStatuses=['planned','in_progress','completed','cancelled'];
function num(v:any,name:string,min=0){const n=Number(v);if(!Number.isFinite(n)||n<min)throw new BadRequestException(`${name} must be a number >= ${min}`);return n;}
function date(v: any, name: string): string | null;
function date(v: any, name: string, required: true): string;
function date(v: any, name: string, required: false): string | null;

function date(
  v: any,
  name: string,
  required = false,
): string | null {
  if (v === undefined || v === null || v === '') {
    if (required) {
      throw new BadRequestException(`${name} is required`);
    }
    return null;
  }

  if (
    typeof v !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(v)
  ) {
    throw new BadRequestException(`${name} must be YYYY-MM-DD`);
  }

  const [year, month, day] = v.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    throw new BadRequestException(`${name} must be a valid calendar date`);
  }

  return v;
}
@Injectable()
export class MaintenanceService {
 constructor(@InjectModel(FarmAsset.name)private assets:Model<FarmAssetDocument>,@InjectModel(MaintenanceRecord.name)private records:Model<MaintenanceRecordDocument>,@InjectModel(SparePart.name)private parts:Model<SparePartDocument>){}
 async dashboard(){
  const assets=await this.assets.find().lean(), records=await this.records.find().lean(), parts=await this.parts.find().lean(), today=new Date().toISOString().slice(0,10);
  const upcoming=records.filter(r=>['planned','in_progress'].includes(r.status)).sort((a,b)=>String(a.plannedDate).localeCompare(String(b.plannedDate)));
  const overdue=upcoming.filter(r=>r.plannedDate<today);
  const dueAssets=assets.filter(a=>a.status!=='retired'&&a.status!=='lost'&&a.nextServiceDate&&a.nextServiceDate<today);
  const lowStock=parts.filter(p=>p.quantityOnHand<=p.reorderLevel);
  const totalMaintenanceCost=records.filter(r=>r.status==='completed').reduce((s,r)=>s+(r.labourCostUgx||0)+(r.partsCostUgx||0)+(r.otherCostUgx||0),0);
  return {totals:{assets:assets.length,activeAssets:assets.filter(a=>a.status==='active').length,needsRepair:assets.filter(a=>a.status==='needs_repair').length,scheduled:upcoming.length,overdue:overdue.length,serviceOverdue:dueAssets.length,lowStock:lowStock.length,completedMaintenanceCostUgx:totalMaintenanceCost},overdue:overdue.slice(0,10),dueAssets:dueAssets.slice(0,10),lowStock:lowStock.slice(0,10),upcoming:upcoming.slice(0,10)};
 }
 async listAssets(query:any={}){const f:any={};if(query.status&&assetStatuses.includes(query.status))f.status=query.status;if(query.assetType&&assetTypes.includes(query.assetType))f.assetType=query.assetType;return this.assets.find(f).sort({name:1}).lean();}
 async createAsset(b:any,actor=''){if(!b?.assetCode?.trim()||!b?.name?.trim())throw new BadRequestException('assetCode and name are required');if(!assetTypes.includes(b.assetType))throw new BadRequestException('Invalid assetType');const status=b.status||'active';if(!assetStatuses.includes(status))throw new BadRequestException('Invalid asset status');return this.assets.create({assetCode:b.assetCode.trim(),name:b.name.trim(),assetType:b.assetType,description:b.description||'',location:b.location||'',serialNumber:b.serialNumber||'',makeModel:b.makeModel||'',purchaseDate:date(b.purchaseDate,'purchaseDate'),purchaseCostUgx:num(b.purchaseCostUgx??0,'purchaseCostUgx'),supplier:b.supplier||'',assignedTo:b.assignedTo||'',status,lastServiceDate:date(b.lastServiceDate,'lastServiceDate'),nextServiceDate:date(b.nextServiceDate,'nextServiceDate'),serviceIntervalDays:num(b.serviceIntervalDays??0,'serviceIntervalDays'),notes:b.notes||'',createdBy:actor});}
 async updateAsset(id:string,b:any){const r=await this.assets.findById(id);if(!r)throw new NotFoundException('Asset not found');for(const k of ['name','description','location','serialNumber','makeModel','supplier','assignedTo','notes'] as const)if(b[k]!==undefined)(r as any)[k]=b[k];if(b.assetType!==undefined){if(!assetTypes.includes(b.assetType))throw new BadRequestException('Invalid assetType');r.assetType=b.assetType;}if(b.status!==undefined){if(!assetStatuses.includes(b.status))throw new BadRequestException('Invalid status');r.status=b.status;}for(const k of ['purchaseDate','lastServiceDate','nextServiceDate'] as const)if(b[k]!==undefined)(r as any)[k]=date(b[k],k);if(b.purchaseCostUgx!==undefined)r.purchaseCostUgx=num(b.purchaseCostUgx,'purchaseCostUgx');if(b.serviceIntervalDays!==undefined)r.serviceIntervalDays=num(b.serviceIntervalDays,'serviceIntervalDays');await r.save();return r;}
 async listRecords(assetId?:string){return this.records.find(assetId?{assetId}:{}).sort({plannedDate:-1}).lean();}
 async createRecord(b: any, actor = '') {
  if (!b?.assetId || !b?.maintenanceCode?.trim() || !b?.title?.trim()) {
    throw new BadRequestException(
      'assetId, maintenanceCode and title are required',
    );
  }

  const asset = await this.assets.findById(b.assetId);

  if (!asset) {
    throw new NotFoundException('Asset not found');
  }

  if (!maintenanceTypes.includes(b.maintenanceType)) {
    throw new BadRequestException('Invalid maintenanceType');
  }

  const status = b.status || 'planned';

  if (!maintenanceStatuses.includes(status)) {
    throw new BadRequestException('Invalid maintenance status');
  }

  const plannedDate = date(b.plannedDate, 'plannedDate', true);
  const suppliedCompletedDate = date(b.completedDate, 'completedDate');

  const completedDate =
    status === 'completed'
      ? suppliedCompletedDate || new Date().toISOString().slice(0, 10)
      : suppliedCompletedDate;

  const rec = await this.records.create({
    assetId: b.assetId,
    maintenanceCode: b.maintenanceCode.trim(),
    maintenanceType: b.maintenanceType,
    title: b.title.trim(),
    description: b.description || '',
    plannedDate,
    completedDate,
    status,
    assignedTo: b.assignedTo || '',
    labourCostUgx: num(b.labourCostUgx ?? 0, 'labourCostUgx'),
    partsCostUgx: num(b.partsCostUgx ?? 0, 'partsCostUgx'),
    otherCostUgx: num(b.otherCostUgx ?? 0, 'otherCostUgx'),
    partsUsed: b.partsUsed || '',
    notes: b.notes || '',
    createdBy: actor,
  });

  if (status === 'completed' && completedDate) {
    const nextServiceDate = this.nextDate(
      completedDate,
      Number(asset.serviceIntervalDays || 0),
    );

    asset.lastServiceDate = completedDate;
    asset.nextServiceDate = nextServiceDate ?? undefined;
    asset.status = 'active';

    await asset.save();
  }

  return rec;
}
 async updateRecord(id: string, b: any) {
  const r = await this.records.findById(id);

  if (!r) {
    throw new NotFoundException('Maintenance record not found');
  }

  for (const k of [
    'title',
    'description',
    'assignedTo',
    'partsUsed',
    'notes',
  ] as const) {
    if (b[k] !== undefined) {
      (r as any)[k] = b[k];
    }
  }

  if (b.maintenanceType !== undefined) {
    if (!maintenanceTypes.includes(b.maintenanceType)) {
      throw new BadRequestException('Invalid maintenanceType');
    }

    r.maintenanceType = b.maintenanceType;
  }

  if (b.status !== undefined) {
    if (!maintenanceStatuses.includes(b.status)) {
      throw new BadRequestException('Invalid status');
    }

    r.status = b.status;

    if (b.status === 'completed') {
      r.completedDate =
        date(b.completedDate, 'completedDate') ??
        new Date().toISOString().slice(0, 10);
    }
  }

  if (b.plannedDate !== undefined) {
    r.plannedDate = date(b.plannedDate, 'plannedDate', true);
  }

  if (b.completedDate !== undefined) {
    r.completedDate = date(b.completedDate, 'completedDate') ?? undefined;
  }

  for (const k of [
    'labourCostUgx',
    'partsCostUgx',
    'otherCostUgx',
  ] as const) {
    if (b[k] !== undefined) {
      (r as any)[k] = num(b[k], k);
    }
  }

  await r.save();

  if (r.status === 'completed') {
    const a = await this.assets.findById(r.assetId);

    if (a) {
      const completedDate =
        r.completedDate || new Date().toISOString().slice(0, 10);

      a.lastServiceDate = completedDate;

      a.nextServiceDate =
        this.nextDate(
          completedDate,
          Number(a.serviceIntervalDays || 0),
        ) ?? undefined;

      a.status = 'active';

      await a.save();
    }
  }

  return r;
}
 async listParts(){return this.parts.find().sort({name:1}).lean();}
 async createPart(b:any,actor=''){if(!b?.partCode?.trim()||!b?.name?.trim())throw new BadRequestException('partCode and name are required');return this.parts.create({partCode:b.partCode.trim(),name:b.name.trim(),category:b.category||'',unit:b.unit||'piece',quantityOnHand:num(b.quantityOnHand??0,'quantityOnHand'),reorderLevel:num(b.reorderLevel??0,'reorderLevel'),unitCostUgx:num(b.unitCostUgx??0,'unitCostUgx'),storageLocation:b.storageLocation||'',supplier:b.supplier||'',notes:b.notes||'',createdBy:actor});}
 async adjustPart(id:string,b:any){const p=await this.parts.findById(id);if(!p)throw new NotFoundException('Spare part not found');if(b.quantityOnHand!==undefined)p.quantityOnHand=num(b.quantityOnHand,'quantityOnHand');if(b.reorderLevel!==undefined)p.reorderLevel=num(b.reorderLevel,'reorderLevel');if(b.unitCostUgx!==undefined)p.unitCostUgx=num(b.unitCostUgx,'unitCostUgx');for(const k of ['name','category','unit','storageLocation','supplier','notes'] as const)if(b[k]!==undefined)(p as any)[k]=b[k];await p.save();return p;}
 private nextDate(last:string,interval:number){if(!last||!interval)return null;const d=new Date(last+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+interval);return d.toISOString().slice(0,10);}
}

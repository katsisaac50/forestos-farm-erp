import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateFarmMapFeatureDto } from './dto';
import { FarmMapFeature, FarmMapFeatureDocument } from './farm-map.schema';
@Injectable()
export class FarmMapService {
  constructor(@InjectModel(FarmMapFeature.name) private readonly model: Model<FarmMapFeatureDocument>) {}
  private validateGeometry(dto: CreateFarmMapFeatureDto) {
    const g: any = dto.geometry;
    if (!g || g.type !== dto.geometryType || !['Point','Polygon'].includes(g.type)) throw new BadRequestException('Geometry type must match geometryType.');
    const pair = (p:any) => Array.isArray(p) && p.length===2 && typeof p[0]==='number' && Number.isFinite(p[0]) && p[0]>=-180 && p[0]<=180 && typeof p[1]==='number' && Number.isFinite(p[1]) && p[1]>=-90 && p[1]<=90;
    if (g.type==='Point') { if (!pair(g.coordinates)) throw new BadRequestException('Point coordinates must be [longitude, latitude] within valid ranges.'); return; }
    const c=g.coordinates;
    if (!Array.isArray(c) || c.length!==1 || !Array.isArray(c[0])) throw new BadRequestException('Polygon must contain one exterior ring.');
    const ring=c[0];
    if (ring.length<4 || ring.length>501 || !ring.every(pair)) throw new BadRequestException('Polygon ring needs 3–500 vertices plus closing coordinate.');
    const a=ring[0], b=ring[ring.length-1];
    if (a[0]!==b[0] || a[1]!==b[1]) throw new BadRequestException('Polygon ring must repeat the first coordinate at the end.');
    if (new Set(ring.slice(0,-1).map((p:number[])=>p.join(','))).size<3) throw new BadRequestException('Polygon needs 3 unique vertices.');
  }
  async create(dto: CreateFarmMapFeatureDto, actor: string) {
    this.validateGeometry(dto);
    if (dto.featureType==='block' && dto.geometryType!=='Polygon') throw new BadRequestException('Farm blocks must use Polygon geometry.');
    if (dto.featureType!=='block' && dto.geometryType!=='Point') throw new BadRequestException('Non-block features must use Point geometry.');
    return this.model.create({...dto,label:dto.label.trim(),blockCode:dto.blockCode?.trim()||undefined,notes:dto.notes?.trim()||undefined,createdBy:actor,status:'active'});
  }
  async list(includeArchived=false) { return this.model.find(includeArchived?{}:{status:'active'}).sort({createdAt:-1}).limit(2000).lean(); }
  async archive(id:string) {
    const f=await this.model.findByIdAndUpdate(id,{status:'archived'},{new:true}).lean();
    if (!f) throw new NotFoundException('Map feature not found.');
    return f;
  }
}

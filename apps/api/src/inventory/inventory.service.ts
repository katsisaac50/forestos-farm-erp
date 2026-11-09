import {Injectable,NotFoundException} from '@nestjs/common';import {InjectModel} from '@nestjs/mongoose';import {Model} from 'mongoose';import {InventoryItem} from './inventory.schema';import {CreateInventoryDto} from './dto';
import {OrganizationContext,requireOrganizationContext} from '../organizations/organization-context';
import {organizationDocument,organizationFilter} from '../organizations/organization-scope';
@Injectable() export class InventoryService {
 constructor(@InjectModel(InventoryItem.name) private model:Model<InventoryItem>){}
 findAll(rawContext:OrganizationContext){const c=requireOrganizationContext(rawContext);return this.model.find(organizationFilter(c)).sort({name:1}).limit(500).lean();}
 create(dto:CreateInventoryDto,rawContext:OrganizationContext){const c=requireOrganizationContext(rawContext);return this.model.create(organizationDocument(c,dto as unknown as Record<string,unknown>));}
 async update(id:string,dto:Partial<CreateInventoryDto>,rawContext:OrganizationContext){const c=requireOrganizationContext(rawContext);const safe:any={...dto};delete safe.organizationId;delete safe.createdBy;const x=await this.model.findOneAndUpdate(organizationFilter(c,{_id:id}),safe,{new:true,runValidators:true}).lean();if(!x)throw new NotFoundException('Inventory item not found');return x;}
}

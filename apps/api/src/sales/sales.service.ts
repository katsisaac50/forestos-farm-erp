import {Injectable,NotFoundException} from '@nestjs/common';import {InjectModel} from '@nestjs/mongoose';import {Model} from 'mongoose';import {SalesOrder} from './sales.schema';import {CreateSalesDto} from './dto';
import {OrganizationContext,requireOrganizationContext} from '../organizations/organization-context';
import {organizationDocument,organizationFilter} from '../organizations/organization-scope';
@Injectable() export class SalesService {
 constructor(@InjectModel(SalesOrder.name) private model:Model<SalesOrder>){}
 findAll(rawContext:OrganizationContext){const c=requireOrganizationContext(rawContext);return this.model.find(organizationFilter(c)).sort({orderDate:-1}).limit(500).lean();}
 create(dto:CreateSalesDto,rawContext:OrganizationContext){const c=requireOrganizationContext(rawContext);return this.model.create(organizationDocument(c,dto as unknown as Record<string,unknown>));}
 async update(id:string,dto:Partial<CreateSalesDto>,rawContext:OrganizationContext){const c=requireOrganizationContext(rawContext);const safe:any={...dto};delete safe.organizationId;delete safe.createdBy;const x=await this.model.findOneAndUpdate(organizationFilter(c,{_id:id}),safe,{new:true,runValidators:true}).lean();if(!x)throw new NotFoundException('Sales order not found');return x;}
}

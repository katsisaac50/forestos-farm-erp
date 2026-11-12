import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Evidence } from './evidence.schema';
import { CreateEvidenceDto } from './dto';
import {
  OrganizationContext,
  requireOrganizationContext,
} from '../organizations/organization-context';
import { organizationFilter } from '../organizations/organization-scope';

type CurrentUser = { email: string; role: string };

@Injectable()
export class EvidenceService {
  constructor(@InjectModel(Evidence.name) private model: Model<Evidence>) {}

  async list(
    inspectionId: string | undefined,
    user: CurrentUser,
    rawContext: OrganizationContext,
  ) {
    const context = requireOrganizationContext(rawContext);

    const roleFilter: Record<string, unknown> = {};
    if (inspectionId) roleFilter.inspectionId = inspectionId;
    if (user.role !== 'owner') roleFilter.uploadedBy = user.email.toLowerCase();

    const filter = organizationFilter(context, roleFilter);
    return this.model
      .find(filter)
      .select('-dataBase64')
      .sort({ capturedAt: -1 })
      .limit(100)
      .lean();
  }

  async create(
    dto: CreateEvidenceDto,
    user: CurrentUser,
    rawContext: OrganizationContext,
  ) {
    const context = requireOrganizationContext(rawContext);

    const raw = String(dto.dataBase64 || '').replace(
      /^data:image\/(jpeg|png|webp);base64,/,
      '',
    );
    if (!raw || raw.length > 5_000_000) {
      throw new ForbiddenException(
        'Image payload too large (max about 3.5 MB encoded image)',
      );
    }
    const buf = Buffer.from(raw, 'base64');
    if (!buf.length || buf.length > 3_500_000) {
      throw new ForbiddenException('Image must be smaller than 3.5 MB');
    }

    // Note: we deliberately do NOT verify that `inspectionId` belongs to this
    // org. That's a separate validation — if you want it, inject the Inspection
    // model and check `findOne({ _id: dto.inspectionId, organizationId })`.
    // The evidence is still org-scoped so it can't leak cross-tenant.
    return this.model.create({
      ...dto,
      organizationId: context.organizationId,
      dataBase64: raw,
      uploadedBy: user.email.toLowerCase(),
      capturedAt: dto.capturedAt ? new Date(dto.capturedAt) : new Date(),
    });
  }

  async image(
    id: string,
    user: CurrentUser,
    rawContext: OrganizationContext,
  ) {
    const context = requireOrganizationContext(rawContext);

    const roleFilter: Record<string, unknown> = {};
    if (user.role !== 'owner') roleFilter.uploadedBy = user.email.toLowerCase();

    const filter = organizationFilter(context, { ...roleFilter, _id: id });
    const doc = await this.model.findOne(filter).lean();
    if (!doc) throw new NotFoundException('Evidence not found');
    return doc;
  }
}


// import {ForbiddenException,Injectable,NotFoundException} from '@nestjs/common';
// import {InjectModel} from '@nestjs/mongoose';import {Model} from 'mongoose';
// import {Evidence} from './evidence.schema';import {CreateEvidenceDto} from './dto';
// @Injectable()
// export class EvidenceService {
//  constructor(@InjectModel(Evidence.name) private model:Model<Evidence>){}
//  async list(inspectionId:string|undefined,user:{email:string;role:string}){const filter:any={};if(inspectionId)filter.inspectionId=inspectionId;if(user.role!=='owner')filter.uploadedBy=user.email.toLowerCase();return this.model.find(filter).select('-dataBase64').sort({capturedAt:-1}).limit(100).lean();}
//  async create(dto:CreateEvidenceDto,user:{email:string;role:string}){
//   const raw=String(dto.dataBase64||'').replace(/^data:image\/(jpeg|png|webp);base64,/,'');
//   if(!raw||raw.length>5_000_000)throw new ForbiddenException('Image payload too large (max about 3.5 MB encoded image)');
//   const buf=Buffer.from(raw,'base64');if(!buf.length||buf.length>3_500_000)throw new ForbiddenException('Image must be smaller than 3.5 MB');
//   return this.model.create({...dto,dataBase64:raw,uploadedBy:user.email.toLowerCase(),capturedAt:dto.capturedAt?new Date(dto.capturedAt):new Date()});
//  }
//  async image(id:string,user:{email:string;role:string}){const filter:any={_id:id};if(user.role!=='owner')filter.uploadedBy=user.email.toLowerCase();const doc=await this.model.findOne(filter).lean();if(!doc)throw new NotFoundException('Evidence not found');return doc;}
// }

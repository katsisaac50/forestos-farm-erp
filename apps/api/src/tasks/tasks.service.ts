import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { FieldTask } from './tasks.schema';
import { CreateTaskDto } from './dto';
import {
  OrganizationContext,
  requireOrganizationContext,
} from '../organizations/organization-context';
import {
  organizationDocument,
  organizationFilter,
} from '../organizations/organization-scope';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(FieldTask.name) private model: Model<FieldTask>,
  ) {}

  findAll(rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    return this.model
      .find(organizationFilter(context))
      .sort({ dueDate: 1 })
      .limit(500)
      .lean();
  }

  create(dto: CreateTaskDto, rawContext: OrganizationContext) {
    const context = requireOrganizationContext(rawContext);
    const payload = organizationDocument(context, dto as unknown as Record<string, unknown>);
    return this.model.create(payload);
  }

  async update(
    id: string,
    dto: Partial<CreateTaskDto>,
    rawContext: OrganizationContext,
  ) {
    const context = requireOrganizationContext(rawContext);
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid task id');

    const safeUpdate: Record<string, unknown> = { ...dto };
    delete (safeUpdate as any).organizationId;

    const updated = await this.model
      .findOneAndUpdate(
        organizationFilter(context, { _id: id }),
        safeUpdate,
        { new: true, runValidators: true },
      )
      .lean();
    if (!updated) throw new NotFoundException('Task not found');
    return updated;
  }
}

// import {Injectable,NotFoundException} from '@nestjs/common';import {InjectModel} from '@nestjs/mongoose';import {Model} from 'mongoose';import {FieldTask} from './tasks.schema';import {CreateTaskDto} from './dto';
// @Injectable() export class TasksService {constructor(@InjectModel(FieldTask.name) private model:Model<FieldTask>){} findAll(){return this.model.find().sort({dueDate:1}).limit(500).lean();} create(dto:CreateTaskDto){return this.model.create(dto);} async update(id:string,dto:Partial<CreateTaskDto>){const x=await this.model.findByIdAndUpdate(id,dto,{new:true,runValidators:true}).lean();if(!x)throw new NotFoundException('Task not found');return x;}}

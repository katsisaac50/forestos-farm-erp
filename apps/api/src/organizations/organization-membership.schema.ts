import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrganizationMembershipDocument =
  HydratedDocument<OrganizationMembership>;

@Schema({ timestamps: true, versionKey: false })
export class OrganizationMembership {
  @Prop({ required: true, index: true, trim: true, lowercase: true })
  userId!: string;

  @Prop({ required: true, index: true, trim: true })
  organizationId!: string;

  @Prop({
    required: true,
    enum: ['owner', 'admin', 'manager', 'field_worker', 'finance', 'viewer'],
  })
  role!: string;

  @Prop({ type: String, enum: ['active', 'suspended'], default: 'active' })
  status!: string;

  @Prop({ required: true, trim: true })
  addedBy!: string;
}

export const OrganizationMembershipSchema =
  SchemaFactory.createForClass(OrganizationMembership);

OrganizationMembershipSchema.index(
  { userId: 1, organizationId: 1 },
  { unique: true },
);

OrganizationMembershipSchema.index({ organizationId: 1, status: 1, role: 1 });
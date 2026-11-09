import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ timestamps: true, versionKey: false })
export class Organization {
  @Prop({
    required: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9][a-z0-9-]{2,62}$/,
  })
  slug!: string;

  @Prop({ required: true, trim: true, maxlength: 160 })
  name!: string;

  @Prop({ type: String, enum: ['active', 'suspended'], default: 'active' })
  status!: string;

  @Prop({ type: String, trim: true, maxlength: 3, default: 'UGX' })
  baseCurrency!: string;

  @Prop({ type: String, trim: true, maxlength: 100, default: 'Africa/Kampala' })
  timezone!: string;

  @Prop({ type: String, trim: true, maxlength: 80 })
  country?: string;

  @Prop({ required: true, trim: true, maxlength: 120 })
  createdBy!: string;

  @Prop({ type: Number, default: 1 })
  recordVersion!: number;
}

export type OrganizationDocument = HydratedDocument<Organization>;

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

OrganizationSchema.index({ slug: 1 }, { unique: true });
OrganizationSchema.index({ status: 1, createdAt: -1 });




// import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
// import { HydratedDocument } from 'mongoose';

// export type OrganizationDocument = HydratedDocument<Organization>;

// @Schema({ timestamps: true, versionKey: false })
// export class Organization {
//   @Prop({
//     required: true,
//     unique: true,
//     trim: true,
//     lowercase: true,
//     match: /^[a-z0-9][a-z0-9-]{2,62}$/,
//   })
//   slug!: string;

//   @Prop({ required: true, trim: true, maxlength: 160 })
//   name!: string;

//   @Prop({ type: String, enum: ['active', 'suspended'], default: 'active' })
//   status!: string;

//   @Prop({ type: String, trim: true, maxlength: 3, default: 'UGX' })
//   baseCurrency!: string;

//   @Prop({ type: String, trim: true, maxlength: 100, default: 'Africa/Kampala' })
//   timezone!: string;

//   @Prop({ type: String, trim: true, maxlength: 80 })
//   country?: string;

//   @Prop({ required: true, trim: true, maxlength: 120 })
//   createdBy!: string;

//   @Prop({ type: Number, default: 1 })
//   recordVersion!: number;
// }

// export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// OrganizationSchema.index({ slug: 1 }, { unique: true });
// OrganizationSchema.index({ status: 1, createdAt: -1 });
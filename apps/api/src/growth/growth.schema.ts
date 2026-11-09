import {Prop,Schema,SchemaFactory} from '@nestjs/mongoose';
@Schema({timestamps:true})
export class GrowthSample {
 @Prop({required:true,index:true}) organizationId!:string;
 @Prop({required:true,trim:true,index:true}) blockId!:string;
 @Prop({required:true}) sampleDate!:Date;
 @Prop({required:true,trim:true}) sampleCode!:string;
 @Prop({required:true,min:1}) treeCount!:number;
 @Prop({required:true,min:0}) averageHeightM!:number;
 @Prop({required:true,min:0}) averageDbhCm!:number;
 @Prop({required:true,trim:true,lowercase:true}) recordedBy!:string;
 @Prop() notes?:string;
}
export const GrowthSampleSchema=SchemaFactory.createForClass(GrowthSample);
GrowthSampleSchema.index({organizationId:1,blockId:1,sampleDate:-1});
GrowthSampleSchema.index({organizationId:1,blockId:1,sampleCode:1},{unique:true});

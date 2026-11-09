import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
export type UserDocument = HydratedDocument<User>;
@Schema({timestamps:true})
export class User {
 @Prop({required:true,unique:true,lowercase:true,trim:true}) email!:string;
 @Prop({required:true,select:false}) passwordHash!:string;
 @Prop({required:true,enum:['owner','field_worker'],default:'field_worker'}) role!:string;
 @Prop({required:true,default:true}) active!:boolean;
}
export const UserSchema=SchemaFactory.createForClass(User);

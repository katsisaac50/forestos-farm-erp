import {Body,Controller,Get,Post,Req,UnauthorizedException,ForbiddenException} from '@nestjs/common';
import {InjectModel} from '@nestjs/mongoose';
import {Model} from 'mongoose';
import {JwtService} from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import {User} from './user.schema';
import {Public,Roles} from './roles.decorator';
@Controller('auth')
export class AuthController {
 constructor(@InjectModel(User.name) private users:Model<User>,private jwt:JwtService){}
 @Public() @Post('setup-owner') async setup(@Body() body:{email?:string;password?:string;setupKey?:string}){
  if(!process.env.OWNER_SETUP_KEY||body.setupKey!==process.env.OWNER_SETUP_KEY)throw new ForbiddenException('Owner setup key is not valid');
  if(await this.users.countDocuments({})>0)throw new ForbiddenException('Setup is already complete');
  const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
  if(!email.includes('@')||password.length<12)throw new UnauthorizedException('Use a valid email and a password of at least 12 characters');
  const user=await this.users.create({email,passwordHash:await bcrypt.hash(password,12),role:'owner',active:true});
  return this.issue(user);
 }
 @Public() @Post('login') async login(@Body() body:{email?:string;password?:string}){
  const user=await this.users.findOne({email:String(body.email||'').trim().toLowerCase(),active:true}).select('+passwordHash');
  if(!user||!await bcrypt.compare(String(body.password||''),user.passwordHash))throw new UnauthorizedException('Email or password is incorrect');
  return this.issue(user);
 }
 @Post('users') @Roles('owner') async createWorker(@Body() body:{email?:string;password?:string;role?:string}){
  const email=String(body.email||'').trim().toLowerCase(),password=String(body.password||'');
  if(!email.includes('@')||password.length<12)throw new UnauthorizedException('Use a valid email and a password of at least 12 characters');
  const role=body.role==='owner'?'owner':'field_worker';
  const user=await this.users.create({email,passwordHash:await bcrypt.hash(password,12),role,active:true});
  return {id:(user as any)._id,email:user.email,role:user.role,active:user.active};
 }
 @Get('me') me(@Req() req:any){return {id:req.user.sub,email:req.user.email,role:req.user.role};}
 private issue(user:any){const payload={sub:String(user._id),email:user.email,role:user.role};return {accessToken:this.jwt.sign(payload),user:{id:payload.sub,email:user.email,role:user.role}};}
}

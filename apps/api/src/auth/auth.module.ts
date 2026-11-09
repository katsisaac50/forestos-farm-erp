import {Module} from '@nestjs/common';
import {MongooseModule} from '@nestjs/mongoose';
import {JwtModule} from '@nestjs/jwt';
import {APP_GUARD} from '@nestjs/core';
import {User,UserSchema} from './user.schema';
import {AuthController} from './auth.controller';
import {AuthGuard} from './roles.guard';
import {resolveJwtSecret} from './jwt-secret-policy';
@Module({imports:[MongooseModule.forFeature([{name:User.name,schema:UserSchema}]),JwtModule.register({secret:resolveJwtSecret(process.env),signOptions:{expiresIn:'8h'}})],controllers:[AuthController],providers:[AuthGuard,{provide:APP_GUARD,useClass:AuthGuard}],exports:[JwtModule]})
export class AuthModule{}

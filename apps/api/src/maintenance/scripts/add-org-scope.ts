import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../app.module';
import { FarmAsset, MaintenanceRecord, SparePart } from '../maintenance.schema';

const ORG_ID = '6aec29f09b731c98872ca3d6';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  for (const name of [FarmAsset.name, MaintenanceRecord.name, SparePart.name]) {
    const model = app.get<Model<any>>(getModelToken(name));
    const res = await model.updateMany({ organizationId: { $exists: false } }, { $set: { organizationId: ORG_ID } });
    console.log(`${name}: ${res.modifiedCount} docs updated`);
  }
  await app.close();
  console.log('Done.');
}

run().catch(e => { console.error(e); process.exit(1); });
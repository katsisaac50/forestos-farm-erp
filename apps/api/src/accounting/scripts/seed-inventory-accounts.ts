import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../app.module';
import { ChartOfAccount } from '../accounting.schema';

const ORG_ID = '6aec29f09b731c98872ca3d6';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const model = app.get<Model<any>>(getModelToken(ChartOfAccount.name));

  const orgs = await model.distinct('organizationId');
  const newAccounts = [
    { code: '4040', name: 'Inventory Adjustment Gain', type: 'revenue', normalSide: 'credit' },
    { code: '6230', name: 'Inventory Adjustment Loss', type: 'expense', normalSide: 'debit' },
  ];

  for (const orgId of orgs) {
    for (const acc of newAccounts) {
      const exists = await model.findOne({ organizationId: orgId, code: acc.code });
      if (!exists) {
        await model.create({ ...acc, organizationId: orgId, active: true, isSystem: true });
        console.log(`Added ${acc.code} to org ${orgId}`);
      } else {
        console.log(`${acc.code} already exists in org ${orgId}`);
      }
    }
  }
  console.log('Done.');
  await app.close();
}

run().catch(e => { console.error(e); process.exit(1); });
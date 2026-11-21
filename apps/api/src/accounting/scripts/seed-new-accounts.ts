import { NestFactory } from '@nestjs/core';
import { Model } from 'mongoose';
import { getModelToken } from '@nestjs/mongoose';
import { AppModule } from '../../app.module';
import { ChartOfAccount } from '../accounting.schema';

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
  const model = app.get<Model<any>>(getModelToken(ChartOfAccount.name));

  const orgs = await model.distinct('organizationId');
  const newAccounts = [
    { code: '4030', name: 'Biological Asset Revaluation Gain', type: 'revenue', normalSide: 'credit' },
    { code: '6320', name: 'Biological Asset Revaluation Loss', type: 'expense', normalSide: 'debit' },
  ];

  for (const orgId of orgs) {
    for (const acc of newAccounts) {
      const exists = await model.findOne({ organizationId: orgId, code: acc.code });
      if (!exists) {
        await model.create({ ...acc, organizationId: orgId, active: true, isSystem: true });
        console.log(`Added ${acc.code} to org ${orgId}`);
      }
    }
  }
  console.log('Done.');
  await app.close();
}

run().catch(e => { console.error(e); process.exit(1); });
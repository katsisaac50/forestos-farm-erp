import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import { NestFactory } from '@nestjs/core';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AppModule } from '../../app.module';
import {
  Supplier, PurchaseRequest, PurchaseOrder,
  PurchaseOrderLine, GoodsReceipt, GoodsReceiptLine,
} from '../procurement.schema';

const ORG_ID = '6aec29f09b731c98872ca3d6';   // ← your single org

async function run() {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });

  const collections = [
    { name: 'Supplier', token: Supplier.name },
    { name: 'PurchaseRequest', token: PurchaseRequest.name },
    { name: 'PurchaseOrder', token: PurchaseOrder.name },
    { name: 'PurchaseOrderLine', token: PurchaseOrderLine.name },
    { name: 'GoodsReceipt', token: GoodsReceipt.name },
    { name: 'GoodsReceiptLine', token: GoodsReceiptLine.name },
  ];

  for (const c of collections) {
    const model = app.get<Model<any>>(getModelToken(c.token));
    const res = await model.updateMany(
      { organizationId: { $exists: false } },
      { $set: { organizationId: ORG_ID } },
    );
    console.log(`${c.name}: ${res.modifiedCount} documents updated`);
  }

  await app.close();
  console.log('Migration complete.');
}

run().catch(e => { console.error(e); process.exit(1); });
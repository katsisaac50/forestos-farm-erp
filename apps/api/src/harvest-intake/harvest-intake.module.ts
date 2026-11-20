import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountingModule } from '../accounting/accounting.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { GrowerContract, GrowerContractSchema, HarvestLot, HarvestLotSchema, LotSale, LotSaleSchema } from './harvest-intake.schema';
import { HarvestGlService } from './harvest-intake-gl.service';
import { HarvestService } from './harvest-intake.service';
import { HarvestIntakeController } from './harvest-intake.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: GrowerContract.name, schema: GrowerContractSchema },
      { name: HarvestLot.name, schema: HarvestLotSchema },
      { name: LotSale.name, schema: LotSaleSchema },
    ]),
    AccountingModule,
    OrganizationsModule,
  ],
  controllers: [HarvestIntakeController],
  providers: [HarvestGlService, HarvestService],
})
export class HarvestIntakeModule {}
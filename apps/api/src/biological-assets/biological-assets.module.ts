import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccountingModule } from '../accounting/accounting.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { BiologicalAsset, BiologicalAssetSchema, BiologicalValuation, BiologicalValuationSchema } from './biological-assets.schema';
import { BiologicalAssetsGlService } from './biological-assets-gl.service';
import { BiologicalAssetsService } from './biological-assets.service';
import { BiologicalAssetsController } from './biological-assets.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BiologicalAsset.name, schema: BiologicalAssetSchema },
      { name: BiologicalValuation.name, schema: BiologicalValuationSchema },
    ]),
    AccountingModule,
    OrganizationsModule,
  ],
  controllers: [BiologicalAssetsController],
  providers: [BiologicalAssetsGlService, BiologicalAssetsService],
})
export class BiologicalAssetsModule {}
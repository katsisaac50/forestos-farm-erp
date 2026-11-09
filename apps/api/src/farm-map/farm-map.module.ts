import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FarmMapController } from './farm-map.controller';
import { FarmMapService } from './farm-map.service';
import { FarmMapFeature, FarmMapFeatureSchema } from './farm-map.schema';
@Module({
 imports:[MongooseModule.forFeature([{name:FarmMapFeature.name,schema:FarmMapFeatureSchema}])],
 controllers:[FarmMapController], providers:[FarmMapService], exports:[FarmMapService]
})
export class FarmMapModule {}

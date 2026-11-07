import { Module } from '@nestjs/common';
import { TablesController } from './tables.controller';
import { ZonesController } from './zones.controller';
import { TablesService } from './tables.service';

@Module({
  controllers: [TablesController, ZonesController],
  providers: [TablesService],
  exports: [TablesService],
})
export class TablesModule {}


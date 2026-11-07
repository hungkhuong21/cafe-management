import { Module } from '@nestjs/common';
import { MenuItemsController } from './menu-items.controller';
import { PublicMenuController } from './public-menu.controller';
import { MenuItemsService } from './menu-items.service';

@Module({
  controllers: [MenuItemsController, PublicMenuController],
  providers: [MenuItemsService],
  exports: [MenuItemsService],
})
export class MenuItemsModule {}


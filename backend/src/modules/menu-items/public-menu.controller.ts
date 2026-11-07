import { Controller, Get, Inject } from '@nestjs/common';
import { MenuItemsService } from './menu-items.service';

@Controller('public/menu')
export class PublicMenuController {
  constructor(@Inject(MenuItemsService) private readonly menuItemsService: MenuItemsService) {}

  @Get()
  getPublicMenu() {
    return this.menuItemsService.findAll(true);
  }
}

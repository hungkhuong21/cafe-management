import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/table.dto';

@Controller('zones')
export class ZonesController {
  constructor(@Inject(TablesService) private readonly tablesService: TablesService) {}

  // 1. GET /zones - Danh sách khu vực
  @Get()
  findAll() {
    return this.tablesService.findAllZones();
  }

  // 2. POST /zones - Thêm khu vực
  @Post()
  create(@Body() dto: CreateZoneDto) {
    return this.tablesService.createZone(dto);
  }

  // 3. PUT /zones/:id - Sửa khu vực
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateZoneDto,
  ) {
    return this.tablesService.updateZone(id, dto);
  }

  // 4. DELETE /zones/:id - Xóa khu vực (bọc transaction an toàn)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tablesService.removeZone(id);
  }
}

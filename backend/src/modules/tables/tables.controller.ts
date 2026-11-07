import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Inject,
} from '@nestjs/common';
import { TablesService } from './tables.service';
import {
  CreateTableDto,
  UpdateTableDto,
  UpdateTableStatusDto,
  SwitchTableDto,
} from './dto/table.dto';

@Controller('tables')
export class TablesController {
  constructor(@Inject(TablesService) private readonly tablesService: TablesService) {}

  // 1. GET /tables - Danh sách bàn (có qr_token)
  @Get()
  findAll() {
    return this.tablesService.findAllTables();
  }

  // Khách đổi bàn: bàn cũ -> 'free', bàn mới -> 'occupied'
  @Post('switch')
  switchTable(@Body() dto: SwitchTableDto) {
    return this.tablesService.switchTable(dto);
  }

  // 2. GET /tables/:id - Chi tiết bàn
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tablesService.findOneTable(id);
  }

  // 3. POST /tables - Thêm bàn
  @Post()
  create(@Body() dto: CreateTableDto) {
    return this.tablesService.createTable(dto);
  }

  // 4. PUT /tables/:id - Sửa bàn
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTableDto,
  ) {
    return this.tablesService.updateTable(id, dto);
  }

  // 5. DELETE /tables/:id - Xóa bàn (bọc transaction an toàn)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.tablesService.removeTable(id);
  }

  // 6. PATCH /tables/:id/status - Đổi trạng thái bàn
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTableStatusDto,
  ) {
    return this.tablesService.updateTableStatus(id, dto);
  }

  // 7. GET /tables/:id/qr - Lấy token và link QR của bàn
  @Get(':id/qr')
  getTableQr(@Param('id', ParseIntPipe) id: number) {
    return this.tablesService.getTableQr(id);
  }

  // 8. POST /tables/:id/qr/regenerate - Tạo lại token (QR cũ hết hiệu lực)
  @Post(':id/qr/regenerate')
  regenerateTableQr(@Param('id', ParseIntPipe) id: number) {
    return this.tablesService.regenerateTableQr(id);
  }
}

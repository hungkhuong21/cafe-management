import { Controller, Get, Query, Inject } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(@Inject(DashboardService) private readonly dashboardService: DashboardService) {}

  // 1. GET /dashboard/overview - Doanh thu, đơn hàng, bàn (so sánh hôm qua)
  @Get('overview')
  getOverview() {
    return this.dashboardService.getOverview();
  }

  // 2. GET /dashboard/revenue-chart - Biểu đồ doanh thu (?range=day|week|month)
  @Get('revenue-chart')
  getRevenueChart(@Query('range') range?: string) {
    return this.dashboardService.getRevenueChart(range || 'day');
  }

  // 3. GET /dashboard/top-products - Món bán chạy
  @Get('top-products')
  getTopProducts(@Query('limit') limit?: number) {
    return this.dashboardService.getTopProducts(limit ? Number(limit) : 5);
  }

  // 4. GET /dashboard/recent-orders - Đơn gần đây
  @Get('recent-orders')
  getRecentOrders(@Query('limit') limit?: number) {
    return this.dashboardService.getRecentOrders(limit ? Number(limit) : 10);
  }

  // 5. GET /dashboard/operation-stats - Thống kê vận hành
  @Get('operation-stats')
  getOperationStats() {
    return this.dashboardService.getOperationStats();
  }
}

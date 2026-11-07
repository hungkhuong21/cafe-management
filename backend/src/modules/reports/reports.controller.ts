import { Controller, Get, Query, Res, Inject } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Controller('reports')
export class ReportsController {
  constructor(@Inject(ReportsService) private readonly reportsService: ReportsService) {}

  // 1. GET /reports/overview: Các thẻ thống kê và so sánh kỳ trước
  @Get('overview')
  async getOverview(@Query() query: ReportQueryDto) {
    return this.reportsService.getOverview(query);
  }

  // 2. GET /reports/revenue: Biểu đồ doanh thu theo groupBy (day/week/month)
  @Get('revenue')
  async getRevenue(@Query() query: ReportQueryDto) {
    return this.reportsService.getRevenue(query);
  }

  // 3. GET /reports/revenue-by-category: Tỷ trọng theo nhóm (biểu đồ tròn)
  @Get('revenue-by-category')
  async getRevenueByCategory(@Query() query: ReportQueryDto) {
    return this.reportsService.getRevenueByCategory(query);
  }

  // 4. GET /reports/top-products: Món bán chạy
  @Get('top-products')
  async getTopProducts(@Query() query: ReportQueryDto) {
    return this.reportsService.getTopProducts(query);
  }

  // 5. GET /reports/peak-hours: Khung giờ cao điểm
  @Get('peak-hours')
  async getPeakHours(@Query() query: ReportQueryDto) {
    return this.reportsService.getPeakHours(query);
  }

  // 6. GET /reports/orders: Thống kê số đơn theo trạng thái
  @Get('orders')
  async getOrdersStats(@Query() query: ReportQueryDto) {
    return this.reportsService.getOrdersStats(query);
  }

  // 7. GET /reports/export: Xuất CSV từ server
  @Get('export')
  async exportCsv(@Query() query: ReportQueryDto, @Res() res: Response) {
    const data = await this.reportsService.getExportData(query);

    // Xây dựng nội dung file CSV
    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += `BÁO CÁO DOANH THU,${data.period}\n\n`;

    csvContent += `Chỉ số,Giá trị,So sánh\n`;
    for (const s of data.overview.stats) {
      csvContent += `"${s.label}","${s.value}","${s.trend}"\n`;
    }

    csvContent += `\nDoanh thu theo thời gian (${data.revenue.subtitle})\n`;
    csvContent += `Thời gian,Doanh thu (triệu đồng)\n`;
    for (const item of data.revenue.data) {
      csvContent += `"${item.label}","${item.value}"\n`;
    }

    csvContent += `\nTỷ trọng theo nhóm sản phẩm\n`;
    csvContent += `Nhóm,Tỷ trọng (%),Doanh thu (đồng)\n`;
    for (const cat of data.byCat) {
      csvContent += `"${cat.name}","${cat.percent}%","${cat.revenue}"\n`;
    }

    csvContent += `\nMón bán chạy\n`;
    csvContent += `Tên món,Số lượng,Doanh thu (đồng)\n`;
    for (const p of data.topProducts) {
      csvContent += `"${p.name}","${p.qty}","${p.revenue}"\n`;
    }

    csvContent += `\nKhung giờ cao điểm\n`;
    csvContent += `Khung giờ,Số đơn\n`;
    for (const h of data.peakHours) {
      csvContent += `"${h.range}","${h.orders}"\n`;
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-doanh-thu.csv"');
    return res.send(csvContent);
  }
}


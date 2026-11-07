import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';

@Injectable()
export class DashboardService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  // 1. GET /dashboard/overview - Doanh thu, đơn hàng, bàn (so sánh hôm qua)
  async getOverview() {
    // 1. Doanh thu & đơn hôm nay
    const todayRevenueRes = await this.db.query(`
      SELECT 
        COALESCE(SUM(oi.unit_price * oi.quantity), 0) as total_revenue,
        COUNT(DISTINCT o.id) as total_orders
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
        AND (o.payment_method IS NOT NULL OR o.status = 'done')
    `);

    // Doanh thu & đơn hôm qua
    const yesterdayRevenueRes = await this.db.query(`
      SELECT 
        COALESCE(SUM(oi.unit_price * oi.quantity), 0) as total_revenue,
        COUNT(DISTINCT o.id) as total_orders
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 1
        AND (o.payment_method IS NOT NULL OR o.status = 'done')
    `);

    // Tổng số đơn hôm nay (mọi trạng thái)
    const allOrdersTodayRes = await this.db.query(`
      SELECT COUNT(id) as total_orders 
      FROM orders 
      WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
    `);

    // Bàn ăn: dùng bảng dining_tables
    const tablesRes = await this.db.query(`
      SELECT 
        COUNT(id) as total_tables,
        COUNT(id) FILTER (WHERE status = 'occupied') as occupied_tables
      FROM dining_tables
    `);

    const todayRevenue = Number(todayRevenueRes.rows[0]?.total_revenue || 0);
    const yesterdayRevenue = Number(yesterdayRevenueRes.rows[0]?.total_revenue || 0);
    const todayOrders = Number(allOrdersTodayRes.rows[0]?.total_orders || 0);
    const yesterdayOrders = Number(yesterdayRevenueRes.rows[0]?.total_orders || 0);

    const totalTables = Number(tablesRes.rows[0]?.total_tables || 0);
    const occupiedTables = Number(tablesRes.rows[0]?.occupied_tables || 0);

    // Giá trị trung bình mỗi đơn (AOV)
    const paidOrdersCount = Number(todayRevenueRes.rows[0]?.total_orders || 0);
    const averageOrderValue = paidOrdersCount > 0 ? Math.round(todayRevenue / paidOrdersCount) : 0;

    // % tăng trưởng doanh thu so với hôm qua
    let revenueTrendText = '↑ 0%';
    if (yesterdayRevenue > 0) {
      const diff = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
      revenueTrendText = `${diff >= 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(1)}%`;
    } else if (todayRevenue > 0) {
      revenueTrendText = '↑ 100%';
    }

    const orderDiff = todayOrders - yesterdayOrders;
    const orderTrendText = `${orderDiff >= 0 ? '↑' : '↓'} ${Math.abs(orderDiff)} đơn`;

    const tablePercent = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

    return {
      stats: [
        {
          label: 'Doanh thu hôm nay',
          value: todayRevenue >= 1_000_000 
            ? `${(todayRevenue / 1_000_000).toFixed(2).replace('.', ',')} tr`
            : `${todayRevenue.toLocaleString('vi-VN')} đ`,
          raw_value: todayRevenue,
          trend: revenueTrendText,
          tone: 'orange',
          icon: 'revenue',
        },
        {
          label: 'Đơn đã nhận',
          value: `${todayOrders}`,
          raw_value: todayOrders,
          trend: orderTrendText,
          tone: 'blue',
          icon: 'orders',
        },
        {
          label: 'Giá trị trung bình',
          value: `${averageOrderValue.toLocaleString('vi-VN')} đ`,
          raw_value: averageOrderValue,
          trend: 'Hôm nay',
          tone: 'green',
          icon: 'average',
        },
        {
          label: 'Bàn đang dùng',
          value: `${occupiedTables} / ${totalTables}`,
          raw_value: { occupied: occupiedTables, total: totalTables },
          trend: `${tablePercent}% công suất`,
          tone: 'amber',
          icon: 'tables',
        },
      ],
      details: {
        todayRevenue,
        yesterdayRevenue,
        todayOrders,
        occupiedTables,
        totalTables,
        averageOrderValue,
      },
    };
  }

  // 2. GET /dashboard/revenue-chart - Biểu đồ doanh thu (?range=day|week|month)
  async getRevenueChart(range: string = 'day') {
    if (range === 'week') {
      // 7 ngày gần nhất
      const res = await this.db.query(`
        WITH days AS (
          SELECT generate_series(
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 6,
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
            '1 day'::interval
          )::date AS d
        ),
        daily_rev AS (
          SELECT 
            (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d,
            COALESCE(SUM(oi.unit_price * oi.quantity), 0)::int AS total
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE (o.payment_method IS NOT NULL OR o.status = 'done')
          GROUP BY d
        )
        SELECT 
          TO_CHAR(days.d, 'DD/MM') AS label,
          COALESCE(r.total, 0) AS value
        FROM days
        LEFT JOIN daily_rev r ON days.d = r.d
        ORDER BY days.d ASC;
      `);
      return {
        range: 'week',
        chartData: res.rows,
      };
    }

    if (range === 'month') {
      // 30 ngày gần nhất
      const res = await this.db.query(`
        WITH days AS (
          SELECT generate_series(
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 29,
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
            '1 day'::interval
          )::date AS d
        ),
        daily_rev AS (
          SELECT 
            (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d,
            COALESCE(SUM(oi.unit_price * oi.quantity), 0)::int AS total
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE (o.payment_method IS NOT NULL OR o.status = 'done')
          GROUP BY d
        )
        SELECT 
          TO_CHAR(days.d, 'DD/MM') AS label,
          COALESCE(r.total, 0) AS value
        FROM days
        LEFT JOIN daily_rev r ON days.d = r.d
        ORDER BY days.d ASC;
      `);
      return {
        range: 'month',
        chartData: res.rows,
      };
    }

    // Mặc định: range = 'day' (Từ 8h đến 22h, so sánh hôm nay và hôm qua)
    const query = `
      WITH hours AS (
        SELECT generate_series(8, 22) AS hr
      ),
      today_revenue AS (
        SELECT 
          EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hr,
          COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS total
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date
          AND (o.payment_method IS NOT NULL OR o.status = 'done')
        GROUP BY hr
      ),
      yesterday_revenue AS (
        SELECT 
          EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hr,
          COALESCE(SUM(oi.unit_price * oi.quantity), 0) AS total
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - 1
          AND (o.payment_method IS NOT NULL OR o.status = 'done')
        GROUP BY hr
      )
      SELECT 
        h.hr,
        CONCAT(h.hr, 'h') AS hour,
        COALESCE(t.total, 0)::int AS today,
        COALESCE(y.total, 0)::int AS yesterday
      FROM hours h
      LEFT JOIN today_revenue t ON h.hr = t.hr
      LEFT JOIN yesterday_revenue y ON h.hr = y.hr
      ORDER BY h.hr ASC;
    `;

    const res = await this.db.query(query);

    const totalToday = res.rows.reduce((sum, r) => sum + Number(r.today), 0);
    const totalYesterday = res.rows.reduce((sum, r) => sum + Number(r.yesterday), 0);

    let growthPercent = '+0%';
    if (totalYesterday > 0) {
      const diff = ((totalToday - totalYesterday) / totalYesterday) * 100;
      growthPercent = `${diff >= 0 ? '+' : '-'}${Math.abs(diff).toFixed(1)}%`;
    } else if (totalToday > 0) {
      growthPercent = '+100%';
    }

    return {
      range: 'day',
      growthPercent,
      totalToday,
      totalYesterday,
      chartData: res.rows.map((r) => ({
        hour: r.hour,
        today: Number(r.today),
        yesterday: Number(r.yesterday),
      })),
    };
  }

  // 3. GET /dashboard/top-products - Món bán chạy (Top 5)
  async getTopProducts(limit: number = 5) {
    const res = await this.db.query(
      `
      SELECT 
        COALESCE(oi.menu_item_id, 0) as id,
        oi.name,
        COALESCE(m.image_url, '') as image_url,
        SUM(oi.quantity)::int as sold_count,
        SUM(oi.unit_price * oi.quantity)::int as total_revenue,
        ROUND(AVG(oi.unit_price))::int as price
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE (o.payment_method IS NOT NULL OR o.status = 'done')
      GROUP BY oi.menu_item_id, oi.name, m.image_url
      ORDER BY sold_count DESC
      LIMIT $1;
      `,
      [limit],
    );

    return res.rows.map((r) => ({
      id: r.id,
      name: r.name,
      sold: `${r.sold_count} đã bán`,
      sold_count: r.sold_count,
      price: r.price,
      total_revenue: r.total_revenue,
      image_url: r.image_url,
      emoji: '☕',
    }));
  }

  // 4. GET /dashboard/recent-orders - Đơn gần đây (Top 10)
  async getRecentOrders(limit: number = 10) {
    const res = await this.db.query(
      `
      SELECT 
        o.id,
        o.code,
        o.table_id,
        CONCAT('Bàn ', LPAD(dt.number::text, 2, '0')) as table_name,
        o.status,
        o.note,
        o.payment_method,
        o.created_at,
        o.done_at,
        COALESCE(SUM(oi.unit_price * oi.quantity), 0)::int as total_amount,
        COALESCE(SUM(oi.quantity), 0)::int as total_items,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'name', oi.name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
        ) as items
      FROM orders o
      LEFT JOIN dining_tables dt ON o.table_id = dt.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id, dt.number
      ORDER BY o.id DESC
      LIMIT $1;
      `,
      [limit],
    );

    return res.rows;
  }

  // 5. GET /dashboard/operation-stats - Thống kê vận hành
  async getOperationStats() {
    const [menuRes, tablesRes, ordersRes] = await Promise.all([
      this.db.query(`
        SELECT 
          COUNT(id) as total_items,
          COUNT(id) FILTER (WHERE status = 'available') as available_items,
          COUNT(id) FILTER (WHERE status = 'soldout') as soldout_items
        FROM menu_items;
      `),
      this.db.query(`
        SELECT 
          COUNT(id) as total_tables,
          COUNT(id) FILTER (WHERE status = 'free') as free_tables,
          COUNT(id) FILTER (WHERE status = 'occupied') as occupied_tables,
          COUNT(id) FILTER (WHERE status = 'cleaning') as cleaning_tables,
          COUNT(id) FILTER (WHERE status = 'reserved') as reserved_tables
        FROM dining_tables;
      `),
      this.db.query(`
        SELECT 
          COUNT(id) FILTER (WHERE status = 'new') as new_orders,
          COUNT(id) FILTER (WHERE status = 'preparing') as preparing_orders,
          COUNT(id) FILTER (WHERE status = 'ready') as ready_orders,
          COUNT(id) FILTER (WHERE status = 'done') as done_orders
        FROM orders
        WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date;
      `),
    ]);

    return {
      menu: menuRes.rows[0],
      tables: tablesRes.rows[0],
      orders: ordersRes.rows[0],
    };
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { ReportQueryDto } from './dto/report-query.dto';

@Injectable()
export class ReportsService {
  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  /**
   * Helper: Chuẩn hóa khoảng thời gian fromDate - toDate
   * Mặc định là 30 ngày gần nhất tính đến hôm nay
   */
  private resolveDateRange(dto: ReportQueryDto) {
    let toDate = dto.toDate;
    let fromDate = dto.fromDate;

    if (!toDate) {
      const now = new Date();
      toDate = now.toISOString().split('T')[0];
    }
    if (!fromDate) {
      const d = new Date(toDate);
      d.setDate(d.getDate() - 29); // 30 ngày gần nhất
      fromDate = d.toISOString().split('T')[0];
    }

    // Tính kỳ trước tương đương (cùng số ngày)
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const prevEnd = new Date(start);
    prevEnd.setDate(prevEnd.getDate() - 1);
    const prevToDate = prevEnd.toISOString().split('T')[0];

    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevStart.getDate() - diffDays + 1);
    const prevFromDate = prevStart.toISOString().split('T')[0];

    return { fromDate, toDate, prevFromDate, prevToDate, diffDays };
  }

  // 1. GET /reports/overview: Các thẻ thống kê và so sánh kỳ trước
  async getOverview(dto: ReportQueryDto) {
    const { fromDate, toDate, prevFromDate, prevToDate } = this.resolveDateRange(dto);

    // 1. Thống kê kỳ này
    const currentRes = await this.db.query(
      `
      SELECT 
        COUNT(DISTINCT o.id)::int as total_orders,
        COALESCE(SUM(CASE WHEN (o.payment_method IS NOT NULL OR o.status = 'done') THEN oi.unit_price * oi.quantity ELSE 0 END), 0)::bigint as total_revenue
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $1::date
        AND (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $2::date
        AND o.status != 'cancelled';
      `,
      [fromDate, toDate],
    );

    // 2. Thống kê kỳ trước để so sánh
    const prevRes = await this.db.query(
      `
      SELECT 
        COUNT(DISTINCT o.id)::int as total_orders,
        COALESCE(SUM(CASE WHEN (o.payment_method IS NOT NULL OR o.status = 'done') THEN oi.unit_price * oi.quantity ELSE 0 END), 0)::bigint as total_revenue
      FROM orders o
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $1::date
        AND (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $2::date
        AND o.status != 'cancelled';
      `,
      [prevFromDate, prevToDate],
    );

    const currentRevenue = Number(currentRes.rows[0]?.total_revenue || 0);
    const currentOrders = Number(currentRes.rows[0]?.total_orders || 0);

    const prevRevenue = Number(prevRes.rows[0]?.total_revenue || 0);
    const prevOrders = Number(prevRes.rows[0]?.total_orders || 0);

    // Tính % tăng trưởng doanh thu
    let revenueTrendText = '↑ 0%';
    if (prevRevenue > 0) {
      const diff = ((currentRevenue - prevRevenue) / prevRevenue) * 100;
      revenueTrendText = `${diff >= 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(1).replace('.', ',')}%`;
    } else if (currentRevenue > 0) {
      revenueTrendText = '↑ 100%';
    }

    // Tính % tăng trưởng đơn hàng
    let orderTrendText = '↑ 0%';
    if (prevOrders > 0) {
      const diff = ((currentOrders - prevOrders) / prevOrders) * 100;
      orderTrendText = `${diff >= 0 ? '↑' : '↓'} ${Math.abs(diff).toFixed(1).replace('.', ',')}%`;
    } else if (currentOrders > 0) {
      orderTrendText = '↑ 100%';
    }

    // Lợi nhuận ước tính (34,5% biên lợi nhuận như thiết kế)
    const estimatedProfit = Math.round(currentRevenue * 0.345);

    // Format tiền triệu
    const formatMillionStr = (val: number) => {
      const tr = val / 1_000_000;
      return `${tr.toFixed(1).replace('.', ',')} tr`;
    };

    return {
      period: { fromDate, toDate, prevFromDate, prevToDate },
      stats: [
        {
          label: 'Tổng doanh thu',
          value: currentRevenue >= 1_000_000 ? formatMillionStr(currentRevenue) : `${currentRevenue.toLocaleString('vi-VN')} đ`,
          raw_value: currentRevenue,
          trend: revenueTrendText,
          tone: 'orange',
          icon: 'Wallet',
        },
        {
          label: 'Tổng đơn hàng',
          value: currentOrders.toLocaleString('vi-VN'),
          raw_value: currentOrders,
          trend: orderTrendText,
          tone: 'blue',
          icon: 'FileText',
        },
        {
          label: 'Lợi nhuận ước tính',
          value: estimatedProfit >= 1_000_000 ? formatMillionStr(estimatedProfit) : `${estimatedProfit.toLocaleString('vi-VN')} đ`,
          raw_value: estimatedProfit,
          trend: '34,5% biên lợi nhuận',
          tone: 'green',
          icon: 'TrendingUp',
        },
      ],
      details: {
        currentRevenue,
        prevRevenue,
        currentOrders,
        prevOrders,
        estimatedProfit,
      },
    };
  }

  // 2. GET /reports/revenue: Biểu đồ doanh thu theo groupBy (day, week, month, year)
  async getRevenue(dto: ReportQueryDto) {
    const { fromDate, toDate, prevFromDate, prevToDate, diffDays } = this.resolveDateRange(dto);
    const groupBy = dto.groupBy || 'day';

    // ── XEM THEO NĂM (YEAR) ──────────────────────────────────────────────────
    if (groupBy === 'year') {
      const res = await this.db.query(
        `
        WITH years AS (
          SELECT EXTRACT(YEAR FROM d)::int AS y
          FROM generate_series(
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - interval '3 years',
            (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date,
            '1 year'::interval
          ) AS d
        ),
        rev AS (
          SELECT 
            EXTRACT(YEAR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS y,
            COALESCE(SUM(oi.unit_price * oi.quantity), 0)::bigint AS total,
            COUNT(DISTINCT o.id)::int AS orders_count
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE (o.payment_method IS NOT NULL OR o.status = 'done')
          GROUP BY y
        )
        SELECT 
          years.y,
          years.y::text AS label,
          CONCAT('Năm ', years.y) AS full_label,
          COALESCE(r.total, 0)::bigint AS raw_value,
          ROUND((COALESCE(r.total, 0)::numeric / 1000000.0), 2)::float AS value,
          COALESCE(r.orders_count, 0) AS orders
        FROM years
        LEFT JOIN rev r ON years.y = r.y
        ORDER BY years.y ASC;
        `
      );

      const rows = res.rows;
      const data = rows.map((r, i) => {
        const prevRow = i > 0 ? rows[i - 1] : null;
        const prevRaw = prevRow ? Number(prevRow.raw_value) : 0;
        const currentRaw = Number(r.raw_value);
        let diffPercent = 0;
        if (prevRaw > 0) {
          diffPercent = Number((((currentRaw - prevRaw) / prevRaw) * 100).toFixed(1));
        } else if (currentRaw > 0) {
          diffPercent = 100;
        }

        return {
          label: r.label,
          full_label: r.full_label,
          value: Number(r.value || 0),
          raw_value: currentRaw,
          prev_raw_value: prevRaw,
          prev_value: Number((prevRaw / 1000000).toFixed(2)),
          diff_percent: diffPercent,
          orders: Number(r.orders || 0),
        };
      });

      const totalCurrent = data.reduce((s, d) => s + d.raw_value, 0);
      const totalPrev = data.reduce((s, d) => s + d.prev_raw_value, 0);
      const growthRate = totalPrev > 0 ? Number((((totalCurrent - totalPrev) / totalPrev) * 100).toFixed(1)) : (totalCurrent > 0 ? 100 : 0);

      return {
        groupBy: 'year',
        subtitle: 'Xu hướng theo các năm • triệu đồng',
        comparison: {
          total_current: totalCurrent,
          total_previous: totalPrev,
          growth_percent: growthRate,
          growth_text: `${growthRate >= 0 ? '+' : ''}${growthRate}% so với kỳ trước`,
        },
        data,
      };
    }

    // ── XEM THEO THÁNG (MONTH) - Hiển thị 12 tháng gần nhất để thấy rõ xu hướng ──
    if (groupBy === 'month') {
      const res = await this.db.query(
        `
        WITH months AS (
          SELECT DATE_TRUNC('month', d)::date AS m_start
          FROM generate_series(
            DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - interval '11 months')::date,
            DATE_TRUNC('month', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::date,
            '1 month'::interval
          ) AS d
        ),
        rev AS (
          SELECT 
            DATE_TRUNC('month', o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS m_start,
            COALESCE(SUM(oi.unit_price * oi.quantity), 0)::bigint AS total,
            COUNT(DISTINCT o.id)::int AS orders_count
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE (o.payment_method IS NOT NULL OR o.status = 'done')
          GROUP BY m_start
        )
        SELECT 
          m.m_start,
          CONCAT('Th', EXTRACT(MONTH FROM m.m_start)) AS label,
          CONCAT('Tháng ', EXTRACT(MONTH FROM m.m_start), '/', EXTRACT(YEAR FROM m.m_start)) AS full_label,
          COALESCE(r.total, 0)::bigint AS raw_value,
          ROUND((COALESCE(r.total, 0)::numeric / 1000000.0), 2)::float AS value,
          COALESCE(r.orders_count, 0) AS orders
        FROM months m
        LEFT JOIN rev r ON m.m_start = r.m_start
        ORDER BY m.m_start ASC;
        `
      );

      const rows = res.rows;
      const data = rows.map((r, i) => {
        const prevRow = i > 0 ? rows[i - 1] : null;
        const prevRaw = prevRow ? Number(prevRow.raw_value) : 0;
        const currentRaw = Number(r.raw_value);
        let diffPercent = 0;
        if (prevRaw > 0) {
          diffPercent = Number((((currentRaw - prevRaw) / prevRaw) * 100).toFixed(1));
        } else if (currentRaw > 0) {
          diffPercent = 100;
        }

        return {
          label: r.label,
          full_label: r.full_label,
          value: Number(r.value || 0),
          raw_value: currentRaw,
          prev_raw_value: prevRaw,
          prev_value: Number((prevRaw / 1000000).toFixed(2)),
          diff_percent: diffPercent,
          orders: Number(r.orders || 0),
        };
      });

      const totalCurrent = data.reduce((s, d) => s + d.raw_value, 0);
      const totalPrev = data.reduce((s, d) => s + d.prev_raw_value, 0);
      const growthRate = totalPrev > 0 ? Number((((totalCurrent - totalPrev) / totalPrev) * 100).toFixed(1)) : (totalCurrent > 0 ? 100 : 0);

      return {
        groupBy: 'month',
        subtitle: '12 tháng gần nhất • triệu đồng',
        comparison: {
          total_current: totalCurrent,
          total_previous: totalPrev,
          growth_percent: growthRate,
          growth_text: `${growthRate >= 0 ? '+' : ''}${growthRate}% so với kỳ trước`,
        },
        data,
      };
    }

    // ── XEM THEO TUẦN (WEEK) - 8 tuần gần nhất ────────────────────────────────
    if (groupBy === 'week') {
      const res = await this.db.query(
        `
        WITH weeks AS (
          SELECT DATE_TRUNC('week', d)::date AS week_start
          FROM generate_series(
            DATE_TRUNC('week', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date - interval '7 weeks')::date,
            DATE_TRUNC('week', (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::date,
            '1 week'::interval
          ) AS d
        ),
        rev AS (
          SELECT 
            DATE_TRUNC('week', o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS week_start,
            COALESCE(SUM(oi.unit_price * oi.quantity), 0)::bigint AS total,
            COUNT(DISTINCT o.id)::int AS orders_count
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE (o.payment_method IS NOT NULL OR o.status = 'done')
          GROUP BY week_start
        )
        SELECT 
          w.week_start,
          CONCAT('Tuần ', TO_CHAR(w.week_start, 'IW')) AS label,
          CONCAT('Tuần ', TO_CHAR(w.week_start, 'IW'), ' (', TO_CHAR(w.week_start, 'DD/MM'), ' — ', TO_CHAR(w.week_start + interval '6 days', 'DD/MM'), ')') AS full_label,
          COALESCE(r.total, 0)::bigint AS raw_value,
          ROUND((COALESCE(r.total, 0)::numeric / 1000000.0), 2)::float AS value,
          COALESCE(r.orders_count, 0) AS orders
        FROM weeks w
        LEFT JOIN rev r ON w.week_start = r.week_start
        ORDER BY w.week_start ASC;
        `
      );

      const rows = res.rows;
      const data = rows.map((r, i) => {
        const prevRow = i > 0 ? rows[i - 1] : null;
        const prevRaw = prevRow ? Number(prevRow.raw_value) : 0;
        const currentRaw = Number(r.raw_value);
        let diffPercent = 0;
        if (prevRaw > 0) {
          diffPercent = Number((((currentRaw - prevRaw) / prevRaw) * 100).toFixed(1));
        } else if (currentRaw > 0) {
          diffPercent = 100;
        }

        return {
          label: r.label,
          full_label: r.full_label,
          value: Number(r.value || 0),
          raw_value: currentRaw,
          prev_raw_value: prevRaw,
          prev_value: Number((prevRaw / 1000000).toFixed(2)),
          diff_percent: diffPercent,
          orders: Number(r.orders || 0),
        };
      });

      const totalCurrent = data.reduce((s, d) => s + d.raw_value, 0);
      const totalPrev = data.reduce((s, d) => s + d.prev_raw_value, 0);
      const growthRate = totalPrev > 0 ? Number((((totalCurrent - totalPrev) / totalPrev) * 100).toFixed(1)) : (totalCurrent > 0 ? 100 : 0);

      return {
        groupBy: 'week',
        subtitle: '8 tuần gần nhất • triệu đồng',
        comparison: {
          total_current: totalCurrent,
          total_previous: totalPrev,
          growth_percent: growthRate,
          growth_text: `${growthRate >= 0 ? '+' : ''}${growthRate}% so với kỳ trước`,
        },
        data,
      };
    }

    // ── XEM THEO NGÀY (DAY) ──────────────────────────────────────────────────
    // Trường hợp 1: Chọn 1 ngày duy nhất (Hôm nay / Hôm qua) -> chia theo giờ (8h - 22h) và so sánh cùng giờ hôm trước
    if (fromDate === toDate) {
      const res = await this.db.query(
        `
        WITH hours AS (
          SELECT generate_series(8, 22) AS hr
        ),
        today_rev AS (
          SELECT 
            EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hr,
            COALESCE(SUM(oi.unit_price * oi.quantity), 0)::bigint AS total,
            COUNT(DISTINCT o.id)::int AS orders_count
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = $1::date
            AND (o.payment_method IS NOT NULL OR o.status = 'done')
          GROUP BY hr
        ),
        prev_rev AS (
          SELECT 
            EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hr,
            COALESCE(SUM(oi.unit_price * oi.quantity), 0)::bigint AS total
          FROM orders o
          JOIN order_items oi ON o.id = oi.order_id
          WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date = ($1::date - 1)
            AND (o.payment_method IS NOT NULL OR o.status = 'done')
          GROUP BY hr
        )
        SELECT 
          h.hr,
          CONCAT(h.hr, 'h') AS label,
          CONCAT(LPAD(h.hr::text, 2, '0'), ':00 — ', LPAD((h.hr + 1)::text, 2, '0'), ':00') AS full_label,
          COALESCE(t.total, 0)::bigint AS raw_value,
          ROUND((COALESCE(t.total, 0)::numeric / 1000000.0), 3)::float AS value,
          COALESCE(p.total, 0)::bigint AS prev_raw_value,
          ROUND((COALESCE(p.total, 0)::numeric / 1000000.0), 3)::float AS prev_value,
          COALESCE(t.orders_count, 0) AS orders
        FROM hours h
        LEFT JOIN today_rev t ON h.hr = t.hr
        LEFT JOIN prev_rev p ON h.hr = p.hr
        ORDER BY h.hr ASC;
        `,
        [fromDate],
      );

      const data = res.rows.map((r) => {
        const currentRaw = Number(r.raw_value);
        const prevRaw = Number(r.prev_raw_value);
        let diffPercent = 0;
        if (prevRaw > 0) {
          diffPercent = Number((((currentRaw - prevRaw) / prevRaw) * 100).toFixed(1));
        } else if (currentRaw > 0) {
          diffPercent = 100;
        }

        return {
          label: r.label,
          full_label: r.full_label,
          value: Number(r.value || 0),
          raw_value: currentRaw,
          prev_raw_value: prevRaw,
          prev_value: Number(r.prev_value || 0),
          diff_percent: diffPercent,
          orders: Number(r.orders || 0),
        };
      });

      const totalCurrent = data.reduce((s, d) => s + d.raw_value, 0);
      const totalPrev = data.reduce((s, d) => s + d.prev_raw_value, 0);
      const growthRate = totalPrev > 0 ? Number((((totalCurrent - totalPrev) / totalPrev) * 100).toFixed(1)) : (totalCurrent > 0 ? 100 : 0);

      return {
        groupBy: 'day',
        subtitle: `Khung giờ trong ngày (8h — 22h) • triệu đồng`,
        comparison: {
          total_current: totalCurrent,
          total_previous: totalPrev,
          growth_percent: growthRate,
          growth_text: `${growthRate >= 0 ? '+' : ''}${growthRate}% so với hôm qua`,
        },
        data,
      };
    }

    // Trường hợp 2: Chọn khoảng nhiều ngày (7 ngày, 30 ngày...)
    const res = await this.db.query(
      `
      WITH days AS (
        SELECT 
          d::date AS d,
          (d::date - ($3::int * '1 day'::interval))::date AS prev_d
        FROM generate_series($1::date, $2::date, '1 day'::interval) AS d
      ),
      cur_rev AS (
        SELECT 
          (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d,
          COALESCE(SUM(oi.unit_price * oi.quantity), 0)::bigint AS total,
          COUNT(DISTINCT o.id)::int AS orders_count
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $1::date
          AND (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $2::date
          AND (o.payment_method IS NOT NULL OR o.status = 'done')
        GROUP BY d
      ),
      prev_rev AS (
        SELECT 
          (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date AS d,
          COALESCE(SUM(oi.unit_price * oi.quantity), 0)::bigint AS total
        FROM orders o
        JOIN order_items oi ON o.id = oi.order_id
        WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $4::date
          AND (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $5::date
          AND (o.payment_method IS NOT NULL OR o.status = 'done')
        GROUP BY d
      )
      SELECT 
        days.d,
        EXTRACT(DOW FROM days.d) as dow,
        TO_CHAR(days.d, 'DD/MM') as date_str,
        TO_CHAR(days.d, 'YYYY-MM-DD') as iso_date,
        COALESCE(c.total, 0)::bigint AS raw_value,
        ROUND((COALESCE(c.total, 0)::numeric / 1000000.0), 2)::float AS value,
        COALESCE(p.total, 0)::bigint AS prev_raw_value,
        ROUND((COALESCE(p.total, 0)::numeric / 1000000.0), 2)::float AS prev_value,
        COALESCE(c.orders_count, 0) AS orders
      FROM days
      LEFT JOIN cur_rev c ON days.d = c.d
      LEFT JOIN prev_rev p ON days.prev_d = p.d
      ORDER BY days.d ASC;
      `,
      [fromDate, toDate, diffDays, prevFromDate, prevToDate],
    );

    const DOW_MAP: Record<number, string> = {
      0: 'CN',
      1: 'T2',
      2: 'T3',
      3: 'T4',
      4: 'T5',
      5: 'T6',
      6: 'T7',
    };

    const isFewDays = res.rows.length <= 10;
    const data = res.rows.map((r) => {
      const currentRaw = Number(r.raw_value);
      const prevRaw = Number(r.prev_raw_value);
      let diffPercent = 0;
      if (prevRaw > 0) {
        diffPercent = Number((((currentRaw - prevRaw) / prevRaw) * 100).toFixed(1));
      } else if (currentRaw > 0) {
        diffPercent = 100;
      }

      return {
        label: isFewDays ? (DOW_MAP[Number(r.dow)] || r.date_str) : r.date_str,
        full_label: `${DOW_MAP[Number(r.dow)] || 'Ngày'}, ${r.date_str}`,
        value: Number(r.value || 0),
        raw_value: currentRaw,
        prev_raw_value: prevRaw,
        prev_value: Number(r.prev_value || 0),
        diff_percent: diffPercent,
        orders: Number(r.orders || 0),
      };
    });

    const totalCurrent = data.reduce((s, d) => s + d.raw_value, 0);
    const totalPrev = data.reduce((s, d) => s + d.prev_raw_value, 0);
    const growthRate = totalPrev > 0 ? Number((((totalCurrent - totalPrev) / totalPrev) * 100).toFixed(1)) : (totalCurrent > 0 ? 100 : 0);

    return {
      groupBy: 'day',
      subtitle: `${res.rows.length} ngày • triệu đồng`,
      comparison: {
        total_current: totalCurrent,
        total_previous: totalPrev,
        growth_percent: growthRate,
        growth_text: `${growthRate >= 0 ? '+' : ''}${growthRate}% so với kỳ trước`,
      },
      data,
    };
  }

  // 3. GET /reports/revenue-by-category: Tỷ trọng theo nhóm (biểu đồ tròn)
  async getRevenueByCategory(dto: ReportQueryDto) {
    const { fromDate, toDate } = this.resolveDateRange(dto);

    const res = await this.db.query(
      `
      SELECT 
        COALESCE(c.name, 'Khác') AS name,
        COALESCE(SUM(oi.unit_price * oi.quantity), 0)::bigint AS revenue,
        COALESCE(SUM(oi.quantity), 0)::int AS quantity
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      LEFT JOIN categories c ON m.category_id = c.id
      WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $1::date
        AND (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $2::date
        AND (o.payment_method IS NOT NULL OR o.status = 'done')
      GROUP BY c.name
      ORDER BY revenue DESC;
      `,
      [fromDate, toDate],
    );

    const rows = res.rows;
    const totalRev = rows.reduce((sum, r) => sum + Number(r.revenue), 0);

    const PALETTE = [
      { stroke: 'stroke-brand', dot: 'bg-brand' },
      { stroke: 'stroke-emerald-600', dot: 'bg-emerald-600' },
      { stroke: 'stroke-amber-500', dot: 'bg-amber-500' },
      { stroke: 'stroke-stone-400', dot: 'bg-stone-400' },
      { stroke: 'stroke-indigo-500', dot: 'bg-indigo-500' },
      { stroke: 'stroke-rose-500', dot: 'bg-rose-500' },
    ];

    if (totalRev === 0) {
      return [
        { name: 'Chưa có doanh thu', percent: 100, revenue: 0, quantity: 0, stroke: 'stroke-stone-300', dot: 'bg-stone-300' },
      ];
    }

    let accumulatedPercent = 0;
    const result = rows.map((r, i) => {
      const rev = Number(r.revenue);
      const isLast = i === rows.length - 1;
      const rawPercent = Math.round((rev / totalRev) * 100);
      const percent = isLast ? Math.max(0, 100 - accumulatedPercent) : rawPercent;
      accumulatedPercent += rawPercent;

      const colors = PALETTE[i % PALETTE.length];
      return {
        name: r.name,
        percent,
        revenue: rev,
        quantity: Number(r.quantity),
        stroke: colors.stroke,
        dot: colors.dot,
      };
    });

    return result;
  }

  // 4. GET /reports/top-products: Món bán chạy
  async getTopProducts(dto: ReportQueryDto) {
    const { fromDate, toDate } = this.resolveDateRange(dto);
    const limit = dto.limit ? Number(dto.limit) : 5;

    const res = await this.db.query(
      `
      SELECT 
        COALESCE(oi.menu_item_id, 0) as id,
        oi.name,
        COALESCE(m.image_url, '') as image_url,
        SUM(oi.quantity)::int as qty,
        SUM(oi.unit_price * oi.quantity)::bigint as revenue
      FROM orders o
      JOIN order_items oi ON o.id = oi.order_id
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $1::date
        AND (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $2::date
        AND (o.payment_method IS NOT NULL OR o.status = 'done')
      GROUP BY oi.menu_item_id, oi.name, m.image_url
      ORDER BY qty DESC, revenue DESC
      LIMIT $3;
      `,
      [fromDate, toDate, limit],
    );

    const EMOJIS = ['☕', '🍵', '🧊', '🥪', '🍰', '🥤'];

    return res.rows.map((r, index) => ({
      id: r.id || index + 1,
      name: r.name,
      qty: Number(r.qty),
      unit: 'ly',
      revenue: Number(r.revenue),
      image_url: r.image_url,
      emoji: EMOJIS[index % EMOJIS.length],
    }));
  }

  // 5. GET /reports/peak-hours: Khung giờ cao điểm
  async getPeakHours(dto: ReportQueryDto) {
    const { fromDate, toDate } = this.resolveDateRange(dto);

    const res = await this.db.query(
      `
      WITH hourly_orders AS (
        SELECT 
          EXTRACT(HOUR FROM o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::int AS hr,
          COUNT(DISTINCT o.id)::int AS order_count
        FROM orders o
        WHERE (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $1::date
          AND (o.created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $2::date
        GROUP BY hr
      )
      SELECT 
        hr,
        COALESCE(order_count, 0) AS orders
      FROM hourly_orders
      ORDER BY hr ASC;
      `,
      [fromDate, toDate],
    );

    const hourMap: Record<number, number> = {};
    res.rows.forEach((r) => {
      hourMap[Number(r.hr)] = Number(r.orders);
    });

    // Gom thành 3 khung giờ chính như thiết kế chuẩn
    const morningOrders = (hourMap[8] || 0) + (hourMap[9] || 0) + (hourMap[10] || 0);
    const lunchOrders = (hourMap[11] || 0) + (hourMap[12] || 0) + (hourMap[13] || 0) + (hourMap[14] || 0);
    const eveningOrders = (hourMap[18] || 0) + (hourMap[19] || 0) + (hourMap[20] || 0) + (hourMap[21] || 0);

    return [
      { range: '08:00 — 10:00', orders: morningOrders },
      { range: '12:00 — 14:00', orders: lunchOrders },
      { range: '19:00 — 21:00', orders: eveningOrders },
    ];
  }

  // 6. GET /reports/orders: Thống kê số đơn theo trạng thái
  async getOrdersStats(dto: ReportQueryDto) {
    const { fromDate, toDate } = this.resolveDateRange(dto);

    const res = await this.db.query(
      `
      SELECT 
        COUNT(id)::int as total,
        COUNT(id) FILTER (WHERE status = 'new')::int as new,
        COUNT(id) FILTER (WHERE status = 'preparing')::int as preparing,
        COUNT(id) FILTER (WHERE status = 'ready')::int as ready,
        COUNT(id) FILTER (WHERE status = 'done')::int as done,
        COUNT(id) FILTER (WHERE status = 'cancelled')::int as cancelled
      FROM orders
      WHERE (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date >= $1::date
        AND (created_at AT TIME ZONE 'Asia/Ho_Chi_Minh')::date <= $2::date;
      `,
      [fromDate, toDate],
    );

    const row = res.rows[0] || {};
    return {
      total: Number(row.total || 0),
      new: Number(row.new || 0),
      preparing: Number(row.preparing || 0),
      ready: Number(row.ready || 0),
      done: Number(row.done || 0),
      cancelled: Number(row.cancelled || 0),
    };
  }

  // 7. GET /reports/export: Dữ liệu xuất CSV từ server
  async getExportData(dto: ReportQueryDto) {
    const { fromDate, toDate } = this.resolveDateRange(dto);
    const [overview, revenue, byCat, topProducts, peakHours] = await Promise.all([
      this.getOverview(dto),
      this.getRevenue(dto),
      this.getRevenueByCategory(dto),
      this.getTopProducts(dto),
      this.getPeakHours(dto),
    ]);

    return {
      period: `${fromDate} đến ${toDate}`,
      overview,
      revenue,
      byCat,
      topProducts,
      peakHours,
    };
  }
}


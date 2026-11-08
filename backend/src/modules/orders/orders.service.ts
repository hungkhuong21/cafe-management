import { Injectable, Inject, BadRequestException, OnModuleInit, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import { CreateOrderDto, UpdateOrderStatusDto } from './dto/order.dto';

@Injectable()
export class OrdersService implements OnModuleInit {
  private readonly logger = new Logger(OrdersService.name);

  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async onModuleInit() {
    try {
      await this.db.query(`
        CREATE SEQUENCE IF NOT EXISTS orders_code_seq START 2001;
        ALTER TABLE orders ADD COLUMN IF NOT EXISTS code VARCHAR(50);
        ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS cost NUMERIC(12,0) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,0) DEFAULT 0;
        ALTER TABLE order_items ADD COLUMN IF NOT EXISTS note TEXT;
      `);
      this.logger.log('Đã kiểm tra và đảm bảo cấu trúc bảng orders / order_items sẵn sàng');
    } catch (err) {
      this.logger.warn('Ghi chú kiểm tra cấu trúc orders:', err);
    }
  }

  async findAll() {
    const res = await this.db.query(`
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
        COALESCE(SUM(oi.unit_price * oi.quantity), 0) as total_amount,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'name', oi.name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'note', COALESCE(oi.note, '')
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
        ) as items
      FROM orders o
      LEFT JOIN dining_tables dt ON o.table_id = dt.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      GROUP BY o.id, dt.number
      ORDER BY o.id DESC
    `);
    return res.rows;
  }

  async findOne(id: number) {
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
        COALESCE(SUM(oi.unit_price * oi.quantity), 0) as total_amount,
        COALESCE(
          json_agg(
            json_build_object(
              'id', oi.id,
              'menu_item_id', oi.menu_item_id,
              'name', oi.name,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'note', COALESCE(oi.note, '')
            )
          ) FILTER (WHERE oi.id IS NOT NULL), '[]'
        ) as items
      FROM orders o
      LEFT JOIN dining_tables dt ON o.table_id = dt.id
      LEFT JOIN order_items oi ON o.id = oi.order_id
      WHERE o.id = $1
      GROUP BY o.id, dt.number
      `,
      [id],
    );
    return res.rows[0];
  }

  async create(dto: CreateOrderDto) {
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Đơn hàng phải có ít nhất 1 món!');
    }

    const pool = this.db.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Kiểm tra và lấy thông tin món từ menu_items
      const preparedItems: { id: number; name: string; quantity: number; unit_price: number; unit_cost: number; note: string }[] = [];

      for (const item of dto.items) {
        let itemRes;
        try {
          itemRes = await client.query(
            'SELECT name, price, status, COALESCE(cost, 0) as cost FROM menu_items WHERE id = $1',
            [item.menu_item_id],
          );
        } catch (_) {
          itemRes = await client.query(
            'SELECT name, price, status, 0 as cost FROM menu_items WHERE id = $1',
            [item.menu_item_id],
          );
        }

        if (itemRes.rows.length === 0) {
          throw new BadRequestException(`Món #${item.menu_item_id} không tồn tại!`);
        }

        const menuItem = itemRes.rows[0];
        if (menuItem.status === 'soldout' || menuItem.status === 'hidden') {
          throw new BadRequestException(
            `Món "${menuItem.name}" hiện đã tạm hết hàng hoặc tạm ngừng phục vụ!`,
          );
        }

        preparedItems.push({
          id: item.menu_item_id,
          name: menuItem.name,
          quantity: item.quantity,
          unit_price: Number(menuItem.price),
          unit_cost: Number(menuItem.cost || 0),
          note: item.note ? String(item.note).trim() : '',
        });
      }

      // 2. Tìm table_id hợp lệ (hỗ trợ cả id và số bàn number)
      let tableId = dto.table_id ? Number(dto.table_id) : null;
      if (tableId) {
        const checkId = await client.query('SELECT id FROM dining_tables WHERE id = $1', [tableId]);
        if (checkId.rows.length === 0) {
          const checkNum = await client.query('SELECT id FROM dining_tables WHERE number = $1', [tableId]);
          if (checkNum.rows.length > 0) {
            tableId = checkNum.rows[0].id;
          } else {
            tableId = null;
          }
        }
      }

      // Tổng hợp ghi chú từng món và tên khách
      const itemNotes = dto.items
        .filter((i) => i.note && i.note.trim())
        .map((i) => {
          const p = preparedItems.find((x) => x.id === i.menu_item_id);
          return `${p?.name || 'Món'}: ${i.note.trim()}`;
        })
        .join('; ');

      const combinedNote = [
        dto.customer_name ? `Khách: ${dto.customer_name}` : '',
        itemNotes ? `Ghi chú: ${itemNotes}` : '',
      ]
        .filter(Boolean)
        .join(' | ');

      // 3. Tạo record orders kèm mã code tự sinh an toàn
      let code = `CF-${Math.floor(1000 + Math.random() * 9000)}`;
      try {
        const seq = await client.query("SELECT 'CF-' || nextval('orders_code_seq') as code");
        if (seq.rows[0]?.code) code = seq.rows[0].code;
      } catch (_) {}

      let orderRes;
      try {
        orderRes = await client.query(
          `INSERT INTO orders (table_id, status, note, code) 
           VALUES ($1, 'new', $2, $3) 
           RETURNING *`,
          [tableId, combinedNote || null, code],
        );
      } catch (_) {
        orderRes = await client.query(
          `INSERT INTO orders (table_id, status, note) 
           VALUES ($1, 'new', $2) 
           RETURNING *`,
          [tableId, combinedNote || null],
        );
      }
      const order = orderRes.rows[0];

      // 4. Tạo record order_items kèm ghi chú từng món
      for (const item of preparedItems) {
        try {
          await client.query(
            `INSERT INTO order_items (order_id, menu_item_id, name, unit_price, unit_cost, quantity, note) 
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [order.id, item.id, item.name, item.unit_price, item.unit_cost, item.quantity, item.note || null],
          );
        } catch (_) {
          try {
            await client.query(
              `INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity, note) 
               VALUES ($1, $2, $3, $4, $5, $6)`,
              [order.id, item.id, item.name, item.unit_price, item.quantity, item.note || null],
            );
          } catch (__) {
            await client.query(
              `INSERT INTO order_items (order_id, menu_item_id, name, unit_price, quantity) 
               VALUES ($1, $2, $3, $4, $5)`,
              [order.id, item.id, item.name, item.unit_price, item.quantity],
            );
          }
        }
      }

      // 5. Cập nhật trạng thái bàn sang 'occupied' (đang dùng)
      if (tableId) {
        await client.query("UPDATE dining_tables SET status = 'occupied' WHERE id = $1", [tableId]);
      }

      await client.query('COMMIT');
      return this.findOne(order.id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async updateStatus(id: number, dto: UpdateOrderStatusDto) {
    const client = await this.db.getPool().connect();
    try {
      await client.query('BEGIN');

      const orderRes = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
      if (orderRes.rows.length === 0) {
        throw new BadRequestException('Không tìm thấy đơn hàng!');
      }
      const order = orderRes.rows[0];
      const newStatus = dto.status || order.status;

      // Xác định phương thức thanh toán: nếu hoàn tất mà chưa có thì mặc định 'cash'
      let paymentMethod = dto.payment_method !== undefined ? dto.payment_method : order.payment_method;
      if (newStatus === 'done' && !paymentMethod) {
        paymentMethod = 'cash';
      }

      const doneAtSql = newStatus === 'done' ? ', done_at = COALESCE(done_at, now())' : '';
      await client.query(
        `UPDATE orders SET status = $1, payment_method = $2 ${doneAtSql} WHERE id = $3`,
        [newStatus, paymentMethod, id],
      );

      // Khi đơn hoàn tất hoặc hủy: nếu bàn không còn đơn nào khác đang phục vụ thì trả bàn về 'free'
      if ((newStatus === 'done' || newStatus === 'cancelled') && order.table_id) {
        const activeRes = await client.query(
          `SELECT COUNT(id) as count 
           FROM orders 
           WHERE (table_id = $1 OR table_id IN (SELECT number FROM dining_tables WHERE id = $1))
             AND id != $2 
             AND status IN ('new', 'preparing', 'ready')`,
          [order.table_id, id],
        );
        const activeCount = Number(activeRes.rows[0]?.count || 0);

        if (activeCount === 0) {
          await client.query(
            `UPDATE dining_tables 
             SET status = 'free' 
             WHERE id = $1 OR number = $1 OR number = (SELECT number FROM dining_tables WHERE id = $1)`,
            [order.table_id],
          );
        }
      }

      // Ngược lại nếu đưa đơn quay lại phục vụ (new, preparing, ready) mà bàn có table_id thì chuyển bàn sang 'occupied'
      if (['new', 'preparing', 'ready'].includes(newStatus) && order.table_id) {
        await client.query(
          `UPDATE dining_tables 
           SET status = 'occupied' 
           WHERE id = $1 OR number = $1 OR number = (SELECT number FROM dining_tables WHERE id = $1)`,
          [order.table_id],
        );
      }

      await client.query('COMMIT');
      return this.findOne(id);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

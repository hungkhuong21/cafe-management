import { Injectable, Inject, OnModuleInit, NotFoundException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service';
import {
  CreateTableDto,
  UpdateTableDto,
  CreateZoneDto,
  UpdateZoneDto,
  UpdateTableStatusDto,
  SwitchTableDto,
} from './dto/table.dto';

@Injectable()
export class TablesService implements OnModuleInit {
  private readonly logger = new Logger(TablesService.name);

  constructor(@Inject(DatabaseService) private readonly db: DatabaseService) {}

  async onModuleInit() {
    await this.initTablesSchema();
  }

  // Đảm bảo cột qr_token tồn tại trên bảng dining_tables
  
  // Khởi tạo cấu trúc database cho khu vực và bàn ăn
  private async initTablesSchema() {
    try {
      // 1. Tạo bảng zones trước
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS zones (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          sort_order INTEGER NOT NULL DEFAULT 0
        );
      `);

      // Đảm bảo cột sort_order tồn tại nếu bảng đã có từ trước
      await this.db.query(`
        ALTER TABLE zones
        ADD COLUMN IF NOT EXISTS sort_order INTEGER NOT NULL DEFAULT 0;
      `);

      // 2. Tạo bảng dining_tables
      await this.db.query(`
        CREATE TABLE IF NOT EXISTS dining_tables (
          id SERIAL PRIMARY KEY,
          number INTEGER NOT NULL UNIQUE,
          zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL,
          seats INTEGER NOT NULL DEFAULT 4,
          status VARCHAR(30) NOT NULL DEFAULT 'free',
          qr_token VARCHAR(32) NOT NULL UNIQUE
            DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 12)
        );
      `);

      // 3. Đảm bảo qr_token và các cột của dining_tables tồn tại trên database cũ
      await this.db.query(`
        ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS qr_token VARCHAR(32) NOT NULL UNIQUE
          DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 12);
        ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS seats INTEGER NOT NULL DEFAULT 4;
        ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS zone_id INTEGER REFERENCES zones(id) ON DELETE SET NULL;
        ALTER TABLE dining_tables ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'free';
        ALTER TABLE dining_tables DROP CONSTRAINT IF EXISTS dining_tables_status_check;
      `);

      this.logger.log(
        'Đã khởi tạo thành công bảng zones và dining_tables'
      );

    } catch (err) {
      this.logger.error(
        'Lỗi khởi tạo cấu trúc database:',
        err instanceof Error ? err.stack : String(err)
      );
      throw err;
    }
  }


  // =========================================================================
  // 1. ZONES (Khu vực)
  // =========================================================================

  // GET /zones - Danh sách khu vực
  async findAllZones() {
    const res = await this.db.query(`
      SELECT z.*, COUNT(dt.id)::int as table_count
      FROM zones z
      LEFT JOIN dining_tables dt ON z.id = dt.zone_id
      GROUP BY z.id
      ORDER BY COALESCE(z.sort_order, 0) ASC, z.id ASC
    `);
    return res.rows;
  }

  // POST /zones - Thêm khu vực
  async createZone(dto: CreateZoneDto) {
    const res = await this.db.query(
      `INSERT INTO zones (name, sort_order) 
       VALUES ($1, $2) 
       RETURNING *`,
      [dto.name.trim(), Number(dto.sort_order) || 0],
    );
    return res.rows[0];
  }

  // PUT /zones/:id - Sửa khu vực
  async updateZone(id: number, dto: UpdateZoneDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.name !== undefined) {
      fields.push(`name = $${idx++}`);
      values.push(dto.name.trim());
    }
    if (dto.sort_order !== undefined) {
      fields.push(`sort_order = $${idx++}`);
      values.push(Number(dto.sort_order));
    }

    if (fields.length === 0) {
      const zRes = await this.db.query('SELECT * FROM zones WHERE id = $1', [id]);
      return zRes.rows[0];
    }

    values.push(id);
    const res = await this.db.query(
      `UPDATE zones SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );

    if (res.rows.length === 0) {
      throw new NotFoundException(`Khu vực #${id} không tồn tại!`);
    }
    return res.rows[0];
  }

  // DELETE /zones/:id - Xóa khu vực (bọc transaction an toàn)
  async removeZone(id: number) {
    const pool = this.db.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      // Gỡ liên kết khu vực khỏi các bàn đang thuộc khu vực này
      await client.query('UPDATE dining_tables SET zone_id = NULL WHERE zone_id = $1', [id]);
      const delRes = await client.query('DELETE FROM zones WHERE id = $1 RETURNING *', [id]);

      if (delRes.rows.length === 0) {
        throw new NotFoundException(`Khu vực #${id} không tồn tại!`);
      }

      await client.query('COMMIT');
      return { success: true, message: `Đã xóa khu vực #${id} thành công` };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // =========================================================================
  // 2. TABLES (Bàn ăn & Mã QR)
  // =========================================================================

  // GET /tables - Danh sách bàn (có qr_token)
  async findAllTables() {
    try {
      // 1. Tự động đồng bộ: Bàn nào đang 'occupied' mà KHÔNG CÒN đơn nào đang phục vụ ('new', 'preparing', 'ready')
      // thì tự động chuyển về 'free' (trống).
      await this.db.query(`
        UPDATE dining_tables dt
        SET status = 'free'
        WHERE dt.status = 'occupied'
          AND NOT EXISTS (
            SELECT 1 FROM orders o
            WHERE (o.table_id = dt.id OR o.table_id = dt.number)
              AND o.status IN ('new', 'preparing', 'ready')
          );
      `);

      // 2. Ngược lại: Bàn nào có đơn hàng đang phục vụ ('new', 'preparing', 'ready') mà chưa phải 'occupied' thì cập nhật 'occupied'
      await this.db.query(`
        UPDATE dining_tables dt
        SET status = 'occupied'
        WHERE dt.status = 'free'
          AND EXISTS (
            SELECT 1 FROM orders o
            WHERE (o.table_id = dt.id OR o.table_id = dt.number)
              AND o.status IN ('new', 'preparing', 'ready')
          );
      `);
    } catch (syncErr) {
      this.logger.warn('Ghi chú tự động đồng bộ trạng thái bàn:', syncErr);
    }

    const res = await this.db.query(`
      SELECT 
        dt.id,
        dt.number,
        CONCAT('Bàn ', LPAD(dt.number::text, 2, '0')) as name,
        dt.seats,
        dt.status,
        dt.zone_id,
        COALESCE(dt.qr_token, '') as qr_token,
        CONCAT('/qr/', dt.qr_token) as qr_url,
        z.name as zone_name 
      FROM dining_tables dt 
      LEFT JOIN zones z ON dt.zone_id = z.id 
      ORDER BY dt.number ASC
    `);
    return res.rows;
  }

  // GET /tables/:id - Chi tiết bàn
  async findOneTable(id: number) {
    const res = await this.db.query(
      `SELECT 
        dt.id,
        dt.number,
        CONCAT('Bàn ', LPAD(dt.number::text, 2, '0')) as name,
        dt.seats,
        dt.status,
        dt.zone_id,
        COALESCE(dt.qr_token, '') as qr_token,
        CONCAT('/qr/', dt.qr_token) as qr_url,
        z.name as zone_name 
       FROM dining_tables dt 
       LEFT JOIN zones z ON dt.zone_id = z.id 
       WHERE dt.id = $1`,
      [id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Bàn #${id} không tồn tại!`);
    }
    return res.rows[0];
  }

  // GET /tables/token/:token - Tra cứu bàn qua mã token QR
  async findTableByToken(token: string) {
    const cleanToken = String(token || '').trim();
    const res = await this.db.query(
      `SELECT 
        dt.id,
        dt.number,
        CONCAT('Bàn ', LPAD(dt.number::text, 2, '0')) as name,
        dt.seats,
        dt.status,
        dt.zone_id,
        COALESCE(dt.qr_token, '') as qr_token,
        CONCAT('/qr/', dt.qr_token) as qr_url,
        z.name as zone_name 
       FROM dining_tables dt 
       LEFT JOIN zones z ON dt.zone_id = z.id 
       WHERE LOWER(dt.qr_token) = LOWER($1) 
          OR dt.number::text = $1 
          OR LPAD(dt.number::text, 2, '0') = $1
          OR dt.id::text = $1
       LIMIT 1`,
      [cleanToken],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Không tìm thấy bàn với mã "${token}"`);
    }
    return res.rows[0];
  }

  // POST /tables - Thêm bàn
  async createTable(dto: CreateTableDto) {
    // Tự sinh số bàn tiếp theo nếu không truyền
    let tableNumber = dto.number ? Number(dto.number) : null;
    if (!tableNumber) {
      const nextNumRes = await this.db.query(
        'SELECT COALESCE(MAX(number), 0) + 1 as next_num FROM dining_tables',
      );
      tableNumber = Number(nextNumRes.rows[0]?.next_num || 1);
    }

    const res = await this.db.query(
      `INSERT INTO dining_tables (number, zone_id, seats, status) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [
        tableNumber,
        dto.zone_id || null,
        Number(dto.seats) || 4,
        dto.status || 'free',
      ],
    );
    return this.findOneTable(res.rows[0].id);
  }

  // PUT /tables/:id - Sửa bàn
  async updateTable(id: number, dto: UpdateTableDto) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (dto.number !== undefined && !isNaN(Number(dto.number))) {
      // Chỉ cập nhật số bàn nếu không trùng với bàn khác
      const checkNum = await this.db.query(
        'SELECT id FROM dining_tables WHERE number = $1 AND id != $2',
        [Number(dto.number), id],
      );
      if (checkNum.rows.length === 0) {
        fields.push(`number = $${idx++}`);
        values.push(Number(dto.number));
      }
    }
    if (dto.seats !== undefined && !isNaN(Number(dto.seats))) {
      fields.push(`seats = $${idx++}`);
      values.push(Math.max(1, Number(dto.seats)));
    }
    if (dto.zone_id !== undefined) {
      if (dto.zone_id && !isNaN(Number(dto.zone_id))) {
        const checkZone = await this.db.query('SELECT id FROM zones WHERE id = $1', [Number(dto.zone_id)]);
        fields.push(`zone_id = $${idx++}`);
        values.push(checkZone.rows.length > 0 ? Number(dto.zone_id) : null);
      } else {
        fields.push(`zone_id = $${idx++}`);
        values.push(null);
      }
    }
    if (dto.status !== undefined) {
      fields.push(`status = $${idx++}`);
      values.push(dto.status);
    }

    if (fields.length > 0) {
      values.push(id);
      const res = await this.db.query(
        `UPDATE dining_tables SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
        values,
      );
      if (res.rows.length === 0) {
        throw new NotFoundException(`Bàn #${id} không tồn tại!`);
      }
    }
    return this.findOneTable(id);
  }

  // DELETE /tables/:id - Xóa bàn (bọc transaction an toàn)
  async removeTable(id: number) {
    const pool = this.db.getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      // 1. Gỡ table_id khỏi các đơn hàng để không vi phạm khóa ngoại
      await client.query('UPDATE orders SET table_id = NULL WHERE table_id = $1', [id]);
      // 2. Xóa bàn ăn
      const delRes = await client.query('DELETE FROM dining_tables WHERE id = $1 RETURNING *', [id]);

      if (delRes.rows.length === 0) {
        throw new NotFoundException(`Bàn #${id} không tồn tại!`);
      }

      await client.query('COMMIT');
      return { success: true, message: `Đã xóa bàn #${id} thành công` };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // PATCH /tables/:id/status - Đổi trạng thái bàn
  async updateTableStatus(id: number, dto: UpdateTableStatusDto) {
    const res = await this.db.query(
      `UPDATE dining_tables SET status = $1 WHERE id = $2 RETURNING *`,
      [dto.status, id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Bàn #${id} không tồn tại!`);
    }

    // Nếu trả bàn về 'free': tự động hoàn tất các đơn đang phục vụ của bàn này
    if (dto.status === 'free') {
      try {
        await this.db.query(
          `UPDATE orders 
           SET status = 'done', 
               payment_method = COALESCE(payment_method, 'cash'),
               done_at = COALESCE(done_at, now())
           WHERE (table_id = $1 OR table_id = (SELECT number FROM dining_tables WHERE id = $1))
             AND status IN ('new', 'preparing', 'ready')`,
          [id],
        );
      } catch (orderErr) {
        this.logger.warn('Ghi chú khi trả bàn về trống:', orderErr);
      }
    }

    return this.findOneTable(id);
  }

  // POST /tables/switch - Khách đổi bàn (bàn cũ -> 'free', bàn mới -> 'occupied')
  async switchTable(dto: SwitchTableDto) {
    const pool = this.db.getPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let fromId = dto.from_table_id ? Number(dto.from_table_id) : null;
      if (!fromId && dto.from_table_number !== undefined) {
        const r = await client.query(
          'SELECT id FROM dining_tables WHERE number = $1',
          [Number(dto.from_table_number)],
        );
        fromId = r.rows[0]?.id || null;
      }

      let toId = dto.to_table_id ? Number(dto.to_table_id) : null;
      if (!toId && dto.to_table_number !== undefined) {
        const r = await client.query(
          'SELECT id FROM dining_tables WHERE number = $1',
          [Number(dto.to_table_number)],
        );
        toId = r.rows[0]?.id || null;
      }

      // 1. Chuyển bàn cũ sang 'free'
      if (fromId) {
        await client.query(
          "UPDATE dining_tables SET status = 'free' WHERE id = $1",
          [fromId],
        );
      }

      // 2. Chuyển bàn mới sang 'occupied'
      if (toId) {
        await client.query(
          "UPDATE dining_tables SET status = 'occupied' WHERE id = $1",
          [toId],
        );
      }

      // 3. Nếu có đơn hàng ở bàn cũ đang hoạt động, cập nhật sang bàn mới
      if (fromId && toId) {
        await client.query(
          "UPDATE orders SET table_id = $1 WHERE table_id = $2 AND status IN ('new', 'preparing', 'ready')",
          [toId, fromId],
        );
      }

      await client.query('COMMIT');

      return {
        success: true,
        message: 'Đổi bàn thành công',
        from_table_id: fromId,
        to_table_id: toId,
        from_status: 'free',
        to_status: 'occupied',
      };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  // GET /tables/:id/qr - Lấy token và link QR của bàn
  async getTableQr(id: number) {
    const table = await this.findOneTable(id);
    return {
      table_id: table.id,
      number: table.number,
      name: table.name,
      qr_token: table.qr_token,
      qr_url: table.qr_url,
    };
  }

  // POST /tables/:id/qr/regenerate - Tạo lại token (QR cũ hết hiệu lực)
  async regenerateTableQr(id: number) {
    const res = await this.db.query(
      `UPDATE dining_tables 
       SET qr_token = substr(md5(random()::text || clock_timestamp()::text), 1, 12) 
       WHERE id = $1 
       RETURNING id, number, qr_token`,
      [id],
    );
    if (res.rows.length === 0) {
      throw new NotFoundException(`Bàn #${id} không tồn tại!`);
    }
    const table = res.rows[0];
    return {
      success: true,
      message: 'Đã tạo lại mã QR mới thành công!',
      table_id: table.id,
      number: table.number,
      qr_token: table.qr_token,
      qr_url: `/qr/${table.qr_token}`,
    };
  }
}

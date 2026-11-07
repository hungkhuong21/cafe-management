import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { Pool, QueryResult, QueryResultRow } from 'pg';

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: Pool;

  onModuleInit() {
    const connectionString = process.env.DATABASE_URL;
    const isCloudDb =
      connectionString &&
      (connectionString.includes('render.com') ||
        connectionString.includes('neon.tech') ||
        connectionString.includes('supabase') ||
        connectionString.includes('sslmode=require') ||
        process.env.DB_SSL === 'true');

    this.pool = new Pool(
      connectionString
        ? {
            connectionString,
            ssl: isCloudDb ? { rejectUnauthorized: false } : undefined,
          }
        : {
            host: process.env.DB_HOST || 'localhost',
            port: Number(process.env.DB_PORT) || 5432,
            user: process.env.DB_USER || 'postgres',
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME || 'cafe-management',
            ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
          },
    );

    this.pool.on('error', (err: Error) => {
      this.logger.error('Unexpected error on idle PostgreSQL client', err);
    });

    this.testConnection();
  }

  async testConnection(): Promise<boolean> {
    try {
      const client = await this.pool.connect();
      const res = await client.query('SELECT NOW()');
      client.release();
      this.logger.log(`PostgreSQL connected successfully at: ${res.rows[0].now}`);
      // Tự động kiểm tra và khởi tạo schema + dữ liệu mẫu nếu CSDL mới chưa có bảng
      await this.initSchema();
      return true;
    } catch (error) {
      this.logger.error('Failed to connect to PostgreSQL database', error);
      return false;
    }
  }

  // Tự động tạo các bảng và chèn dữ liệu mẫu nếu database cloud hoàn toàn mới
  async initSchema() {
    try {
      await this.pool.query(`
        CREATE TABLE IF NOT EXISTS zones (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          sort_order INT NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS dining_tables (
          id SERIAL PRIMARY KEY,
          number INT NOT NULL UNIQUE,
          seats INT NOT NULL DEFAULT 4,
          status VARCHAR(20) NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'reserved')),
          zone_id INT REFERENCES zones(id) ON DELETE SET NULL,
          qr_token VARCHAR(32) NOT NULL UNIQUE DEFAULT substr(md5(random()::text || clock_timestamp()::text), 1, 12)
        );

        CREATE TABLE IF NOT EXISTS categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          image_url VARCHAR(255),
          status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
          sort_order INT NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS menu_items (
          id SERIAL PRIMARY KEY,
          name VARCHAR(150) NOT NULL,
          category_id INT REFERENCES categories(id) ON DELETE SET NULL,
          price NUMERIC(12,0) NOT NULL CHECK (price >= 0),
          cost NUMERIC(12,0) NOT NULL DEFAULT 0 CHECK (cost >= 0),
          promo_price NUMERIC(12,0) CHECK (promo_price >= 0),
          description TEXT,
          image_url VARCHAR(255),
          status VARCHAR(20) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'soldout', 'hidden')),
          show_on_qr BOOLEAN NOT NULL DEFAULT TRUE
        );

        CREATE SEQUENCE IF NOT EXISTS orders_code_seq START 2001;

        CREATE TABLE IF NOT EXISTS orders (
          id SERIAL PRIMARY KEY,
          code VARCHAR(20) NOT NULL UNIQUE DEFAULT ('CF-' || nextval('orders_code_seq')),
          table_id INT REFERENCES dining_tables(id) ON DELETE SET NULL,
          status VARCHAR(20) NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'preparing', 'ready', 'done', 'cancelled')),
          note TEXT,
          payment_method VARCHAR(30),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          done_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS order_items (
          id SERIAL PRIMARY KEY,
          order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
          menu_item_id INT REFERENCES menu_items(id) ON DELETE SET NULL,
          name VARCHAR(150) NOT NULL,
          unit_price NUMERIC(12,0) NOT NULL CHECK (unit_price >= 0),
          unit_cost NUMERIC(12,0) NOT NULL DEFAULT 0,
          quantity INT NOT NULL CHECK (quantity > 0)
        );

        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) NOT NULL UNIQUE,
          password_hash VARCHAR(255) NOT NULL,
          display_name VARCHAR(100) NOT NULL DEFAULT 'Admin',
          role VARCHAR(50) NOT NULL DEFAULT 'Quản lý cửa hàng',
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS store_settings (
          id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
          name VARCHAR(150) NOT NULL DEFAULT 'CafeFlow',
          branch VARCHAR(150) DEFAULT 'Nguyễn Huệ • HCM',
          address VARCHAR(255) DEFAULT '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
          phone VARCHAR(30) DEFAULT '028 1234 5678',
          website VARCHAR(150) DEFAULT 'cafeflow.vn',
          logo_url TEXT
        );

        -- Đảm bảo các cột chứa ảnh là kiểu TEXT để chứa được cả ảnh Base64 và URL dài
        ALTER TABLE menu_items ALTER COLUMN image_url TYPE TEXT;
        ALTER TABLE store_settings ALTER COLUMN logo_url TYPE TEXT;
        ALTER TABLE categories ALTER COLUMN image_url TYPE TEXT;
      `);

      // Kiểm tra nếu chưa có bàn nào thì nạp ngay dữ liệu mẫu
      const checkTables = await this.pool.query('SELECT COUNT(*)::int as count FROM dining_tables');
      if (checkTables.rows[0].count === 0) {
        await this.pool.query(`
          INSERT INTO zones (id, name, sort_order) VALUES
          (1, 'Tầng trệt', 1), (2, 'Lầu 1', 2), (3, 'Sân vườn', 3)
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO dining_tables (number, seats, status, zone_id) VALUES
          (1, 4, 'free', 1), (2, 2, 'free', 1), (3, 4, 'free', 1), (4, 6, 'free', 1),
          (5, 4, 'free', 2), (6, 4, 'free', 2), (7, 2, 'free', 2),
          (8, 4, 'free', 3), (9, 6, 'free', 3), (10, 4, 'free', 3)
          ON CONFLICT (number) DO NOTHING;

          INSERT INTO categories (id, name, sort_order) VALUES
          (1, 'Cà phê truyền thống', 1), (2, 'Cà phê pha máy', 2), (3, 'Trà & Trà trái cây', 3), (4, 'Bánh ngọt', 4)
          ON CONFLICT (id) DO NOTHING;

          INSERT INTO menu_items (name, category_id, price, cost, description, status) VALUES
          ('Cà phê đen đá', 1, 29000, 10000, 'Đậm đà hương vị Robusta Đắk Lắk nguyên chất', 'available'),
          ('Cà phê sữa đá', 1, 35000, 12000, 'Cà phê pha phin kết hợp sữa đặc ngọt béo truyền thống', 'available'),
          ('Bạc xỉu 3 tầng', 1, 39000, 14000, 'Nhiều sữa ít cà phê, béo ngậy ngọt dịu', 'available'),
          ('Espresso', 2, 35000, 12000, 'Chiết xuất từ hạt Arabica Cầu Đất nguyên chất', 'available'),
          ('Americano đá', 2, 39000, 12000, 'Espresso pha loãng thanh nhẹ sảng khoái', 'available'),
          ('Cappuccino nóng', 2, 45000, 16000, 'Lớp bọt sữa mịn màng với hương quế thơm', 'available'),
          ('Trà đào cam sả', 3, 45000, 15000, 'Trà thanh mát kèm đào giòn ngọt và hương sả thơm lừng', 'available'),
          ('Trà vải hoa hồng', 3, 48000, 16000, 'Hương hoa hồng quyến rũ cùng trái vải tươi giòn', 'available'),
          ('Croissant bơ Pháp', 4, 38000, 15000, 'Bánh sừng bò ngàn lớp thơm bơ giòn rụm', 'available'),
          ('Tiramisu truyền thống', 4, 49000, 20000, 'Bánh kem phô mai Mascarpone và cà phê thơm mịn', 'available')
          ON CONFLICT DO NOTHING;

          INSERT INTO users (username, password_hash, display_name, role)
          VALUES ('admin', 'admin123', 'Admin', 'Quản lý cửa hàng')
          ON CONFLICT (username) DO NOTHING;

          INSERT INTO store_settings (id, name, branch, address, phone, website)
          VALUES (1, 'CafeFlow', 'Nguyễn Huệ • HCM', '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', '028 1234 5678', 'cafeflow.vn')
          ON CONFLICT (id) DO NOTHING;
        `);
        this.logger.log('Đã tự động khởi tạo dữ liệu mẫu ban đầu cho CSDL!');
      }
    } catch (err) {
      this.logger.warn('Lỗi khi tự động khởi tạo schema:', err);
    }
  }

  async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[],
  ): Promise<QueryResult<T>> {
    const start = Date.now();
    const res = await this.pool.query<T>(text, params);
    const duration = Date.now() - start;
    this.logger.debug(`Executed query: { text: "${text}", duration: ${duration}ms }`);
    return res;
  }

  getPool(): Pool {
    return this.pool;
  }

  async onModuleDestroy() {
    await this.pool.end();
    this.logger.log('PostgreSQL connection pool closed.');
  }
}

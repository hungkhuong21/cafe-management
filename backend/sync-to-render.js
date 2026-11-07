const { Pool } = require('pg');

// 1. CSDL cục bộ ở máy tính của bạn
const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'cafe-management',
});

// 2. Lấy link CSDL Render từ tham số dòng lệnh
// Chạy: node sync-to-render.js "postgresql://..."
const cloudUrl = process.argv[2] || process.env.RENDER_DATABASE_URL;

if (!cloudUrl) {
  console.error('\n❌ Thiếu đường dẫn CSDL Render!');
  console.log('👉 Cách chạy:');
  console.log('   node sync-to-render.js "dán_External_Database_URL_của_Render_vào_đây"\n');
  process.exit(1);
}

const cloudPool = new Pool({
  connectionString: cloudUrl,
  ssl: { rejectUnauthorized: false },
});

async function syncData() {
  console.log('\n🚀 Bắt đầu đồng bộ dữ liệu từ máy tính lên Cloud Render...\n');

  try {
    const localClient = await localPool.connect();
    console.log('✅ Đã kết nối CSDL cục bộ (localhost)!');

    const cloudClient = await cloudPool.connect();
    console.log('✅ Đã kết nối CSDL Render Cloud!\n');

    // Tạo cấu trúc bảng trên Cloud nếu chưa có
    console.log('🔄 Đang kiểm tra cấu trúc bảng trên Render...');
    await cloudClient.query(`
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
        logo_url VARCHAR(255)
      );
    `);
    console.log('✅ Cấu trúc bảng đã sẵn sàng!\n');

    // Đồng bộ lần lượt các bảng theo thứ tự quan hệ khóa ngoại
    const tables = [
      'zones',
      'dining_tables',
      'categories',
      'menu_items',
      'orders',
      'order_items',
      'users',
      'store_settings',
    ];

    for (const table of tables) {
      try {
        const localData = await localClient.query(`SELECT * FROM ${table} ORDER BY id ASC`);
        if (localData.rows.length === 0) {
          console.log(`ℹ️ [${table}]: Không có dòng dữ liệu nào ở máy local.`);
          continue;
        }

        console.log(`⏳ Đang chuyển ${localData.rows.length} dòng từ bảng [${table}]...`);

        for (const row of localData.rows) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

          await cloudClient.query(
            `INSERT INTO ${table} (${columns.join(', ')}) 
             VALUES (${placeholders}) 
             ON CONFLICT DO NOTHING`,
            values,
          );
        }

        // Cập nhật lại SEQUENCE ID cho bảng nếu có
        try {
          await cloudClient.query(`SELECT setval('${table}_id_seq', COALESCE((SELECT MAX(id) FROM ${table}), 1), true)`);
        } catch (_) {}

        console.log(`✅ [${table}]: Đã chép xong ${localData.rows.length} dòng!`);
      } catch (tableErr) {
        console.warn(`⚠️ Bảng [${table}] bỏ qua:`, tableErr.message);
      }
    }

    localClient.release();
    cloudClient.release();
    await localPool.end();
    await cloudPool.end();

    console.log('\n🎉 ĐỒNG BỘ HOÀN TẤT 100%!');
    console.log('👉 Bây giờ bạn tải lại trang Vercel (Ctrl+F5) là sẽ thấy toàn bộ dữ liệu thật!');
  } catch (err) {
    console.error('❌ Lỗi trong quá trình đồng bộ:', err);
  }
}

syncData();


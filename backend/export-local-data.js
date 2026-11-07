const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Kết nối CSDL cục bộ ở máy tính
const localPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'cafe-management',
});

async function exportData() {
  console.log('🔄 Đang đọc dữ liệu từ CSDL cục bộ (localhost)...');
  try {
    const client = await localPool.connect();

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

    let sqlOutput = `-- =====================================================\n`;
    sqlOutput += `-- DỮ LIỆU ĐƯỢC XUẤT TỪ CSDL CỤC BỘ (CAFEFLOW LOCAL)\n`;
    sqlOutput += `-- Xuất lúc: ${new Date().toLocaleString('vi-VN')}\n`;
    sqlOutput += `-- =====================================================\n\n`;

    for (const table of tables) {
      try {
        const res = await client.query(`SELECT * FROM ${table} ORDER BY id ASC`);
        if (res.rows.length === 0) {
          console.log(`ℹ️ Bảng ${table}: không có dữ liệu`);
          continue;
        }

        console.log(`✅ Bảng ${table}: tìm thấy ${res.rows.length} dòng`);
        sqlOutput += `-- Dữ liệu bảng: ${table} (${res.rows.length} dòng)\n`;

        for (const row of res.rows) {
          const columns = Object.keys(row);
          const values = columns.map((col) => {
            const val = row[col];
            if (val === null || val === undefined) return 'NULL';
            if (typeof val === 'number') return val;
            if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
            if (val instanceof Date) return `'${val.toISOString()}'`;
            if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
            return `'${String(val).replace(/'/g, "''")}'`;
          });

          sqlOutput += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT DO NOTHING;\n`;
        }
        sqlOutput += `\n`;
      } catch (err) {
        console.warn(`⚠️ Bảng ${table} chưa có hoặc lỗi:`, err.message);
      }
    }

    client.release();
    await localPool.end();

    const outputPath = path.join(__dirname, 'local-data-backup.sql');
    fs.writeFileSync(outputPath, sqlOutput, 'utf8');

    console.log(`\n🎉 XUẤT THÀNH CÔNG! File đã được lưu tại: ${outputPath}`);
    console.log(`👉 Bạn có thể mở file này và copy dữ liệu vào CSDL Render.`);
  } catch (err) {
    console.error('❌ Lỗi kết nối CSDL cục bộ:', err.message);
  }
}

exportData();


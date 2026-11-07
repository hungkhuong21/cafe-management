import pg from 'pg';

const client = new pg.Client({
  user: 'postgres',
  password: '123456',
  host: 'localhost',
  port: 5432,
  database: 'cafe_managementt',
});

async function inspectColumns() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      ORDER BY table_name, ordinal_position;
    `);
    
    console.log('\n--- CÁC CỘT TRONG CÁC BẢNG CỦA BẠN ---');
    let currentTable = '';
    res.rows.forEach(r => {
      if (r.table_name !== currentTable) {
        currentTable = r.table_name;
        console.log(`\n[Table: ${currentTable}]`);
      }
      console.log(`  - ${r.column_name} (${r.data_type})`);
    });
    console.log('\n-----------------------------------------\n');
  } catch (err) {
    console.error('Lỗi:', err.message);
  } finally {
    await client.end();
  }
}

inspectColumns();


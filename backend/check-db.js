import pg from 'pg';

const client = new pg.Client({
  user: 'postgres',
  password: '123456',
  host: 'localhost',
  port: 5432,
  database: 'postgres', // kết nối tạm vào database mặc định để quét danh sách
});

async function findDatabases() {
  try {
    await client.connect();
    const res = await client.query(`
      SELECT datname 
      FROM pg_database 
      WHERE datistemplate = false;
    `);
    console.log('\n--- DANH SACH CAC DATABASE CO TREN MAY BAN ---');
    res.rows.forEach(r => console.log('->', r.datname));
    console.log('----------------------------------------------\n');
  } catch (err) {
    console.error('Loi ket noi PostgreSQL:', err.message);
  } finally {
    await client.end();
  }
}

findDatabases();


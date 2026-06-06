const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  console.log('[Migration] Creating izin_petugas table...');
  
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });

  try {
    const migrationPath = path.join(__dirname, 'migrations', 'create_izin_petugas.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    await conn.execute(migrationSql);
    
    console.log('[Migration] Table izin_petugas created successfully!');
  } catch (err) {
    console.error('[Migration] Error:', err);
  } finally {
    await conn.end();
  }
}

applyMigration();

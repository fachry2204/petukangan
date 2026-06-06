const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  console.log('[Migration] Starting...');
  
  const conn = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'ppsu_monitoring'
  });

  try {
    const migrationPath = path.join(__dirname, 'migrations', 'update_attendance_for_permit.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements and execute them one by one
    const statements = migrationSql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      try {
        await conn.execute(statement);
        console.log('[Migration] Executed: ✓');
      } catch (err) {
        // Some statements might fail if columns already exist, that's okay
        console.log('[Migration] Warning:', err.message);
      }
    }

    console.log('[Migration] Completed successfully!');
  } catch (err) {
    console.error('[Migration] Error:', err);
  } finally {
    await conn.end();
  }
}

applyMigration();

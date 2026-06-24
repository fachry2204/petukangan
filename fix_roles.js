const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ppsu_monitoring'
  });

  try {
    // Check if there is a roles table
    const [tables] = await conn.query("SHOW TABLES LIKE 'roles'");
    if (tables.length > 0) {
      console.log('Found roles table. Updating...');
      await conn.query("UPDATE roles SET name = 'PJLP' WHERE name = 'PPSU'");
      console.log('Roles table updated.');
    }

    // Check if there is a roleName column in users table
    const [cols] = await conn.query("SHOW COLUMNS FROM users LIKE 'roleName'");
    if (cols.length > 0) {
      console.log('Found roleName column in users. Updating...');
      await conn.query("UPDATE users SET roleName = 'PJLP' WHERE roleName = 'PPSU'");
      console.log('Users table updated.');
    }

    // Check if there is an admins table
    const [adminTables] = await conn.query("SHOW TABLES LIKE 'admins'");
    if (adminTables.length > 0) {
      const [adminCols] = await conn.query("SHOW COLUMNS FROM admins LIKE 'roleName'");
      if (adminCols.length > 0) {
         console.log('Found roleName in admins. Updating...');
         await conn.query("UPDATE admins SET roleName = 'PJLP' WHERE roleName = 'PPSU'");
         console.log('Admins table updated.');
      }
    }
    
    console.log('Database role rename completed successfully.');
  } catch (error) {
    console.error('Database update failed:', error);
  } finally {
    await conn.end();
  }
}

run();

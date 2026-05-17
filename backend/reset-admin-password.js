const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function resetAdminPassword() {
  const connection = await mysql.createConnection({
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '3306'),
    user: process.env.DATABASE_USER || 'root',
    password: process.env.DATABASE_PASSWORD || '',
    database: process.env.DATABASE_NAME || 'ppsu_monitoring',
  });

  try {
    const plainPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    const [result] = await connection.execute(
      'UPDATE users SET password = ? WHERE username = ?',
      [hashedPassword, 'admin']
    );

    console.log('Password reset successful. Rows affected:', result.affectedRows);
  } catch (error) {
    console.error('Error resetting password:', error);
  } finally {
    await connection.end();
  }
}

resetAdminPassword();

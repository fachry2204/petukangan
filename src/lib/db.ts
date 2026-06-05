import mysql from 'mysql2/promise';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ppsu_monitoring',
};

export async function getDbConnection() {
  return mysql.createConnection(dbConfig);
}

export async function queryDb(sql: string, values?: any[]) {
  const conn = await getDbConnection();
  try {
    const [rows] = await conn.execute(sql, values);
    return rows;
  } finally {
    await conn.end();
  }
}

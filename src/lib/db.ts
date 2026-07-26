import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ppsu_monitoring',
  connectTimeout: 10000,
  waitForConnections: true,
  connectionLimit: 25,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

export async function getDbConnection() {
  const conn = await pool.getConnection();
  // Safe wrapper: if caller code calls conn.end(), release back to connection pool
  (conn as any).end = async function () {
    conn.release();
    return Promise.resolve();
  };
  return conn;
}

export async function queryDb(sql: string, values?: any[]) {
  const [rows] = await pool.execute(sql, values);
  return rows;
}

export default pool;

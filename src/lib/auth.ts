import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { queryDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'ppsusmartmonitoring2026';

export function signToken(payload: any) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

export async function comparePassword(plain: string, hashed: string) {
  return bcrypt.compare(plain, hashed);
}

export async function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

async function ensureAdminUsersTable() {
  try {
    await queryDb(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        fullName VARCHAR(100) NOT NULL,
        email VARCHAR(255) DEFAULT NULL,
        phone VARCHAR(50) DEFAULT NULL,
        roleName ENUM('ADMIN','STAFF','PIMPINAN') NOT NULL DEFAULT 'ADMIN',
        status ENUM('ACTIVE','INACTIVE') DEFAULT 'ACTIVE',
        createdAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
        updatedAt DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch {
    // ignore
  }
}

export async function getUserByUsername(username: string) {
  const rows: any = await queryDb(
    `SELECT u.*, r.name as roleName FROM users u JOIN roles r ON r.id = u.roleId WHERE u.username = ?`,
    [username]
  );
  return rows?.[0] || null;
}

export async function getUserById(id: number) {
  const rows: any = await queryDb(
    `SELECT u.*, r.name as roleName FROM users u JOIN roles r ON r.id = u.roleId WHERE u.id = ?`,
    [id]
  );
  return rows?.[0] || null;
}

export async function getAdminByUsername(username: string) {
  await ensureAdminUsersTable();
  const rows: any = await queryDb(`SELECT * FROM admin_users WHERE username = ? LIMIT 1`, [username]);
  return rows?.[0] || null;
}

export async function getAdminById(id: number) {
  await ensureAdminUsersTable();
  const rows: any = await queryDb(`SELECT * FROM admin_users WHERE id = ? LIMIT 1`, [id]);
  return rows?.[0] || null;
}

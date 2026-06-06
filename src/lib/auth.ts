import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { queryDb } from './db';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

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

import { NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { queryDb } from '@/lib/db';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  console.log('[Auth] Header:', authHeader ? authHeader.substring(0, 50) + '...' : 'NONE');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  console.log('[Auth] Token length:', token.length);
  const decoded = verifyToken(token);
  console.log('[Auth] Decoded:', decoded ? 'OK (sub=' + decoded.sub + ')' : 'FAIL');
  return decoded;
}

export async function GET(req: Request) {
  try {
    console.log('[GET /api/users] Incoming request');
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    console.log('[GET /api/users] Fetching users...');
    const rows: any = await queryDb(
      `SELECT u.id, u.username, u.fullName, u.gender, u.birthDate, u.phone, u.address, u.country, u.province, u.city, u.district, u.village, u.postalCode, u.joinDate, u.photoUrl, u.status, u.statusReason, u.statusChangedAt, u.lastSeen, u.deviceId, u.documents, u.createdAt, u.updatedAt, u.roleId, u.zoneId, r.name as roleName
       FROM users u LEFT JOIN roles r ON r.id = u.roleId`
    );
    console.log('[GET /api/users] Found', rows?.length || 0, 'users');
    return NextResponse.json(rows || []);
  } catch (err: any) {
    console.error('[GET /api/users] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { username, password, fullName, email, phone, roleName, zone, gender, birthDate, address, province, city, district, village, postalCode, status } = body;

    if (!username || !password || !fullName) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    // Find role
    let roleId = null;
    if (roleName) {
      const roles: any = await queryDb('SELECT id FROM roles WHERE name = ?', [roleName]);
      if (roles?.[0]) roleId = roles[0].id;
    }

    const hashed = await hashPassword(password);

    await queryDb(
      `INSERT INTO users (username, password, fullName, email, phone, roleId, zone, gender, birthDate, address, province, city, district, village, postalCode, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', NOW(6), NOW(6))`,
      [username, hashed, fullName, email || null, phone || null, roleId, zone || null, gender || null, birthDate || null, address || null, province || null, city || null, district || null, village || null, postalCode || null]
    );

    return NextResponse.json({ message: 'User berhasil dibuat' }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/users] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { queryDb } from '@/lib/db';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const rows: any = await queryDb(
      `SELECT u.id, u.username, u.fullName, u.gender, u.birthDate, u.phone, u.address, u.country, u.province, u.city, u.district, u.village, u.postalCode, u.joinDate, u.photoUrl, u.status, u.statusReason, u.statusChangedAt, u.lastSeen, u.deviceId, u.documents, u.createdAt, u.updatedAt, u.roleId, u.zoneId, r.name as roleName
       FROM users u LEFT JOIN roles r ON r.id = u.roleId WHERE u.id = ?`,
      [id]
    );
    if (!rows?.[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (err: any) {
    console.error('[GET /api/users/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await req.json();

    // Ensure photoUrl column can hold large base64 images
    try {
      await queryDb('ALTER TABLE users MODIFY photoUrl LONGTEXT');
    } catch { /* column may already be LONGTEXT */ }

    let roleId: any = undefined;
    if (body.roleName) {
      const roles: any = await queryDb('SELECT id FROM roles WHERE name = ?', [body.roleName]);
      if (roles?.[0]) roleId = roles[0].id;
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (body.username !== undefined) { updates.push('username = ?'); values.push(body.username); }
    if (body.fullName !== undefined) { updates.push('fullName = ?'); values.push(body.fullName); }
    if (body.email !== undefined) { updates.push('email = ?'); values.push(body.email); }
    if (body.phone !== undefined) { updates.push('phone = ?'); values.push(body.phone); }
    if (body.photoUrl !== undefined) { updates.push('photoUrl = ?'); values.push(body.photoUrl); }
    if (body.zone !== undefined) { updates.push('zone = ?'); values.push(body.zone); }
    if (body.gender !== undefined) { updates.push('gender = ?'); values.push(body.gender); }
    if (body.birthDate !== undefined) { updates.push('birthDate = ?'); values.push(body.birthDate); }
    if (body.joinDate !== undefined) { updates.push('joinDate = ?'); values.push(body.joinDate); }
    if (body.address !== undefined) { updates.push('address = ?'); values.push(body.address); }
    if (body.province !== undefined) { updates.push('province = ?'); values.push(body.province); }
    if (body.city !== undefined) { updates.push('city = ?'); values.push(body.city); }
    if (body.district !== undefined) { updates.push('district = ?'); values.push(body.district); }
    if (body.village !== undefined) { updates.push('village = ?'); values.push(body.village); }
    if (body.postalCode !== undefined) { updates.push('postalCode = ?'); values.push(body.postalCode); }
    if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }
    if (roleId !== undefined) { updates.push('roleId = ?'); values.push(roleId); }
    if (body.password) { updates.push('password = ?'); values.push(await hashPassword(body.password)); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diupdate' }, { status: 400 });
    }

    values.push(id);
    await queryDb(`UPDATE users SET ${updates.join(', ')}, updatedAt = NOW(6) WHERE id = ?`, values);

    return NextResponse.json({ message: 'User berhasil diupdate' });
  } catch (err: any) {
    console.error('[PUT /api/users/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    await queryDb('DELETE FROM users WHERE id = ?', [id]);
    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (err: any) {
    console.error('[DELETE /api/users/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

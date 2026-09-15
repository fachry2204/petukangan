import { NextResponse } from 'next/server';
import { verifyToken, hashPassword } from '@/lib/auth';
import { queryDb } from '@/lib/db';
import { emitUserChange } from '@/lib/socket-emit';

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

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

const userRelationChecks = [
  { table: 'attendance', column: 'userId', label: 'riwayat absensi' },
  { table: 'attendance_requests', column: 'userId', label: 'permintaan absensi' },
  { table: 'gps_tracking', column: 'userId', label: 'riwayat lokasi GPS' },
  { table: 'lembur', column: 'userId', label: 'riwayat lembur' },
  { table: 'reports', column: 'userId', label: 'laporan petugas' },
  { table: 'tasks', column: 'assignedToId', label: 'tugas yang diberikan' },
] as const;

async function getBlockingUserRelations(id: string) {
  const results = await Promise.all(
    userRelationChecks.map(async (relation) => {
      const rows = await queryDb(
        `SELECT COUNT(*) AS total FROM \`${relation.table}\` WHERE \`${relation.column}\` = ?`,
        [id]
      ) as Array<{ total: number | string }>;
      return { label: relation.label, count: Number(rows[0]?.total || 0) };
    })
  );

  return results.filter((relation) => relation.count > 0);
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    if (type === 'admin') {
      await ensureAdminUsersTable();
      const rows: any = await queryDb(
        `SELECT id, username, fullName, email, phone, roleName, status, createdAt, updatedAt FROM admin_users WHERE id = ? LIMIT 1`,
        [id]
      );
      if (!rows?.[0]) return NextResponse.json({ error: 'User not found' }, { status: 404 });
      return NextResponse.json(rows[0]);
    }

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

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();

    const url = new URL(req.url);
    if (url.searchParams.get('type') === 'admin') {
      if (decoded.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      await ensureAdminUsersTable();

      const updates: string[] = [];
      const values: unknown[] = [];
      const allowedRoles = ['ADMIN', 'STAFF', 'PIMPINAN'];
      const allowedStatuses = ['ACTIVE', 'INACTIVE'];

      if (body.username !== undefined) {
        const username = String(body.username).trim().replace(/^@/, '');
        if (!username || /\s/.test(username)) {
          return NextResponse.json({ error: 'Username wajib diisi dan tidak boleh mengandung spasi.' }, { status: 400 });
        }
        updates.push('username = ?');
        values.push(username);
      }
      if (body.fullName !== undefined) {
        const fullName = String(body.fullName).trim();
        if (!fullName) return NextResponse.json({ error: 'Nama lengkap wajib diisi.' }, { status: 400 });
        updates.push('fullName = ?');
        values.push(fullName);
      }
      if (body.email !== undefined) { updates.push('email = ?'); values.push(String(body.email).trim() || null); }
      if (body.phone !== undefined) { updates.push('phone = ?'); values.push(String(body.phone).trim() || null); }
      if (body.roleName !== undefined) {
        const roleName = String(body.roleName);
        if (!allowedRoles.includes(roleName)) return NextResponse.json({ error: 'Role administrator tidak valid.' }, { status: 400 });
        updates.push('roleName = ?');
        values.push(roleName);
      }
      if (body.status !== undefined) {
        const status = String(body.status);
        if (!allowedStatuses.includes(status)) return NextResponse.json({ error: 'Status akun tidak valid.' }, { status: 400 });
        updates.push('status = ?');
        values.push(status);
      }

      if (updates.length === 0) {
        return NextResponse.json({ error: 'Tidak ada data administrator yang diubah.' }, { status: 400 });
      }

      values.push(id);
      const result = await queryDb(
        `UPDATE admin_users SET ${updates.join(', ')}, updatedAt = NOW(6) WHERE id = ?`,
        values
      ) as { affectedRows?: number };
      if (!result.affectedRows) return NextResponse.json({ error: 'Akun administrator tidak ditemukan.' }, { status: 404 });

      emitUserChange('update', { id: Number(id) });
      return NextResponse.json({ message: 'Data administrator berhasil diperbarui.' });
    }

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
    if (body.zoneId !== undefined) { updates.push('zoneId = ?'); values.push(body.zoneId); }
    if (body.documents !== undefined) { 
      updates.push('documents = ?'); 
      values.push(body.documents ? JSON.stringify(body.documents) : null); 
    }
    if (body.gender !== undefined) {
      updates.push('gender = ?');
      values.push(body.gender ? String(body.gender).trim().toUpperCase() : null);
    }
    if (body.birthDate !== undefined) { updates.push('birthDate = ?'); values.push(body.birthDate); }
    if (body.joinDate !== undefined) { updates.push('joinDate = ?'); values.push(body.joinDate); }
    if (body.address !== undefined) { updates.push('address = ?'); values.push(body.address); }
    if (body.province !== undefined) { updates.push('province = ?'); values.push(body.province); }
    if (body.city !== undefined) { updates.push('city = ?'); values.push(body.city); }
    if (body.district !== undefined) { updates.push('district = ?'); values.push(body.district); }
    if (body.village !== undefined) { updates.push('village = ?'); values.push(body.village); }
    if (body.postalCode !== undefined) { updates.push('postalCode = ?'); values.push(body.postalCode); }
    if (body.country !== undefined) { updates.push('country = ?'); values.push(body.country); }
    if (body.status !== undefined) { updates.push('status = ?'); values.push(body.status); }
    if (roleId !== undefined) { updates.push('roleId = ?'); values.push(roleId); }
    if (body.password) { updates.push('password = ?'); values.push(await hashPassword(body.password)); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data yang diupdate' }, { status: 400 });
    }

    values.push(id);
    await queryDb(`UPDATE users SET ${updates.join(', ')}, updatedAt = NOW(6) WHERE id = ?`, values);

    emitUserChange('update', { id: Number(id) });
    return NextResponse.json({ message: 'User berhasil diupdate' });
  } catch (err: any) {
    console.error('[PUT /api/users/:id] error:', err);
    if (err?.code === 'ER_DUP_ENTRY') {
      return NextResponse.json({ error: 'Username sudah digunakan oleh akun lain.' }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (decoded.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const type = url.searchParams.get('type');

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');
    if (action !== 'reset_password') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const newPassword = String(body?.newPassword || '');
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'Password baru minimal 8 karakter.' }, { status: 400 });
    }
    const hashed = await hashPassword(newPassword);
    if (type === 'admin') {
      await ensureAdminUsersTable();
      const result = await queryDb('UPDATE admin_users SET password = ?, updatedAt = NOW(6) WHERE id = ?', [hashed, id]) as { affectedRows?: number };
      if (!result.affectedRows) return NextResponse.json({ error: 'Akun administrator tidak ditemukan.' }, { status: 404 });
      emitUserChange('update', { id: Number(id) });
      return NextResponse.json({ message: 'Password berhasil diperbarui.' });
    }
    try {
      await queryDb('UPDATE users SET password = ?, updatedAt = NOW(6) WHERE id = ?', [hashed, id]);
    } catch {
      await queryDb('UPDATE users SET password = ?, updated_at = NOW(6) WHERE id = ?', [hashed, id]);
    }

    emitUserChange('update', { id: Number(id) });
    return NextResponse.json({ message: 'Password berhasil direset' });
  } catch (err: any) {
    console.error('[POST /api/users/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const url = new URL(req.url);
    const type = url.searchParams.get('type');
    if (type === 'admin') {
      await ensureAdminUsersTable();
      await queryDb('DELETE FROM admin_users WHERE id = ?', [id]);
    } else {
      const users = await queryDb(
        'SELECT id, fullName, username FROM users WHERE id = ? LIMIT 1',
        [id]
      ) as Array<{ id: number; fullName: string; username: string }>;
      const targetUser = users[0];

      if (!targetUser) {
        return NextResponse.json(
          { error: 'Petugas tidak ditemukan atau sudah dihapus.' },
          { status: 404 }
        );
      }

      const blockingRelations = await getBlockingUserRelations(id);
      if (blockingRelations.length > 0) {
        const relationSummary = blockingRelations
          .map((relation) => `${relation.count} ${relation.label}`)
          .join(', ');

        return NextResponse.json(
          {
            code: 'USER_HAS_RELATED_DATA',
            error: `Petugas ${targetUser.fullName || targetUser.username} tidak dapat dihapus karena masih memiliki ${relationSummary}. Ubah status petugas menjadi Nonaktif agar riwayat tetap tersimpan.`,
            relations: blockingRelations,
          },
          { status: 409 }
        );
      }

      await queryDb('DELETE FROM users WHERE id = ?', [id]);
    }
    emitUserChange('delete', { id: Number(id) });
    return NextResponse.json({ message: 'User berhasil dihapus' });
  } catch (err: any) {
    console.error('[DELETE /api/users/:id] error:', err);
    if (err?.code === 'ER_ROW_IS_REFERENCED_2' || err?.errno === 1451) {
      return NextResponse.json(
        {
          code: 'USER_HAS_RELATED_DATA',
          error: 'Petugas tidak dapat dihapus karena masih terhubung dengan data operasional. Ubah status petugas menjadi Nonaktif agar riwayat tetap tersimpan.',
        },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Terjadi kesalahan saat menghapus petugas. Silakan coba lagi atau hubungi administrator sistem.' },
      { status: 500 }
    );
  }
}

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

type ColumnInfo = { Field: string };

async function getColumns(tableName: string): Promise<Record<string, boolean>> {
  try {
    const rows: any = await queryDb(`SHOW COLUMNS FROM \`${tableName}\``);
    const map: Record<string, boolean> = {};
    for (const r of rows || []) {
      const field = (r as ColumnInfo).Field;
      if (field) map[field] = true;
    }
    return map;
  } catch {
    return {};
  }
}

function resolveColumn(columns: Record<string, boolean>, candidates: string[]): string | null {
  for (const c of candidates) {
    if (columns[c]) return c;
  }
  return null;
}

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

    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'ppsu';

    if (type === 'admin') {
      await ensureAdminUsersTable();
      const rows: any = await queryDb(
        `SELECT id, username, fullName, email, phone, roleName, status, createdAt, updatedAt FROM admin_users ORDER BY id DESC`
      );
      return NextResponse.json(rows || []);
    }

    console.log('[GET /api/users] Fetching PPSU users...');
    const rows: any = await queryDb(
      `SELECT u.id, u.username, u.fullName, u.gender, u.birthDate, u.phone, u.address, u.country, u.province, u.city, u.district, u.village, u.postalCode, u.joinDate, u.photoUrl, u.status, u.statusReason, u.statusChangedAt, u.lastSeen, u.deviceId, u.documents, u.createdAt, u.updatedAt, u.roleId, u.zoneId, r.name as roleName
       FROM users u LEFT JOIN roles r ON r.id = u.roleId
       WHERE r.name = 'PPSU' OR r.name IS NULL`
    );
    console.log('[GET /api/users] Found', rows?.length || 0, 'PPSU users');
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
    if (String(body?.action) === 'migrate_admins') {
      if (decoded.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

      await ensureAdminUsersTable();

      const userCols = await getColumns('users');
      const rolesCols = await getColumns('roles');

      const userIdCol = resolveColumn(userCols, ['id']);
      const usernameCol = resolveColumn(userCols, ['username']);
      const passwordCol = resolveColumn(userCols, ['password']);
      const fullNameCol = resolveColumn(userCols, ['fullName', 'full_name']);
      const emailCol = resolveColumn(userCols, ['email']);
      const phoneCol = resolveColumn(userCols, ['phone']);
      const statusCol = resolveColumn(userCols, ['status']);
      const roleIdCol = resolveColumn(userCols, ['roleId', 'role_id']);

      if (!userIdCol || !usernameCol || !passwordCol) {
        return NextResponse.json({ error: 'Skema tabel users tidak sesuai untuk migrasi' }, { status: 500 });
      }

      const canJoinRoles = !!roleIdCol && !!rolesCols['id'] && !!rolesCols['name'];

      let sourceRows: any[] = [];
      if (canJoinRoles) {
        sourceRows = (await queryDb(
          `
            SELECT
              u.\`${userIdCol}\` AS id,
              u.\`${usernameCol}\` AS username,
              u.\`${passwordCol}\` AS password,
              ${fullNameCol ? `u.\`${fullNameCol}\` AS fullName` : `NULL AS fullName`},
              ${emailCol ? `u.\`${emailCol}\` AS email` : `NULL AS email`},
              ${phoneCol ? `u.\`${phoneCol}\` AS phone` : `NULL AS phone`},
              ${statusCol ? `u.\`${statusCol}\` AS status` : `'ACTIVE' AS status`},
              r.name AS roleName
            FROM users u
            JOIN roles r ON r.id = u.\`${roleIdCol}\`
            WHERE r.name IN ('ADMIN','STAFF','PIMPINAN')
          `
        )) as any[];
      } else {
        const roleNameCol = resolveColumn(userCols, ['roleName', 'role_name']);
        if (!roleNameCol) {
          return NextResponse.json({ error: 'Tidak ditemukan kolom role di users' }, { status: 500 });
        }
        sourceRows = (await queryDb(
          `
            SELECT
              \`${userIdCol}\` AS id,
              \`${usernameCol}\` AS username,
              \`${passwordCol}\` AS password,
              ${fullNameCol ? `\`${fullNameCol}\` AS fullName` : `NULL AS fullName`},
              ${emailCol ? `\`${emailCol}\` AS email` : `NULL AS email`},
              ${phoneCol ? `\`${phoneCol}\` AS phone` : `NULL AS phone`},
              ${statusCol ? `\`${statusCol}\` AS status` : `'ACTIVE' AS status`},
              \`${roleNameCol}\` AS roleName
            FROM users
            WHERE \`${roleNameCol}\` IN ('ADMIN','STAFF','PIMPINAN')
          `
        )) as any[];
      }

      const idsToDelete: number[] = [];
      let inserted = 0;
      let updated = 0;

      for (const r of sourceRows || []) {
        const roleName = String(r.roleName || '').toUpperCase();
        if (!['ADMIN', 'STAFF', 'PIMPINAN'].includes(roleName)) continue;
        const res: any = await queryDb(
          `
            INSERT INTO admin_users (username, password, fullName, email, phone, roleName, status, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))
            ON DUPLICATE KEY UPDATE
              fullName = VALUES(fullName),
              email = VALUES(email),
              phone = VALUES(phone),
              roleName = VALUES(roleName),
              status = VALUES(status),
              updatedAt = NOW(6)
          `,
          [
            r.username,
            r.password,
            r.fullName || r.username,
            r.email || null,
            r.phone || null,
            roleName,
            r.status || 'ACTIVE',
          ]
        );

        const affected = Number(res?.affectedRows || 0);
        if (affected === 1) inserted += 1;
        else if (affected >= 2) updated += 1;

        const idNum = Number(r.id);
        if (Number.isFinite(idNum)) idsToDelete.push(idNum);
      }

      let deleted = 0;
      let deleteError: string | null = null;
      if (idsToDelete.length > 0) {
        try {
          const placeholders = idsToDelete.map(() => '?').join(',');
          const delRes: any = await queryDb(
            `DELETE FROM users WHERE \`${userIdCol}\` IN (${placeholders})`,
            idsToDelete
          );
          deleted = Number(delRes?.affectedRows || 0);
        } catch (e: any) {
          deleteError = e?.message || 'Gagal menghapus data admin dari tabel users';
        }
      }

      return NextResponse.json({
        message: 'Migrasi admin selesai',
        found: (sourceRows || []).length,
        inserted,
        updated,
        deletedFromUsers: deleted,
        deleteError,
      });
    }

    const { username, password, fullName, email, phone, roleName, zoneId, gender, birthDate, joinDate, address, country, province, city, district, village, postalCode, photoUrl, documents, status } = body;

    if (!username || !password || !fullName) {
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    if (['ADMIN', 'STAFF', 'PIMPINAN'].includes(String(roleName))) {
      await ensureAdminUsersTable();
      const hashed = await hashPassword(password);
      await queryDb(
        `INSERT INTO admin_users (username, password, fullName, email, phone, roleName, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))`,
        [username, hashed, fullName, email || null, phone || null, roleName, status || 'ACTIVE']
      );
      emitUserChange('create', { username, fullName });
      return NextResponse.json({ message: 'Admin berhasil dibuat', username }, { status: 201 });
    }

    // Find role
    let roleId = null;
    if (roleName) {
      const roles: any = await queryDb('SELECT id FROM roles WHERE name = ?', [roleName]);
      if (roles?.[0]) roleId = roles[0].id;
    }

    // Auto-generate sequential ID for PPSU
    let finalUsername = username;
    if (roleName === 'PPSU') {
      try {
        const lastUsers: any = await queryDb(
          `SELECT username FROM users WHERE username REGEXP '^PPSU[0-9]+$' ORDER BY CAST(SUBSTRING(username, 5) AS UNSIGNED) DESC LIMIT 1`
        );
        let nextId = 1;
        if (lastUsers && lastUsers.length > 0) {
          const match = lastUsers[0].username.match(/^PPSU(\d+)$/i);
          if (match) {
            nextId = parseInt(match[1], 10) + 1;
          }
        }
        finalUsername = `PPSU${nextId.toString().padStart(3, '0')}`;
      } catch (err) {
        console.error('Failed to generate sequential ID:', err);
        // Fallback if regex fails on older MySQL versions
        finalUsername = `PPSU${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
      }
    }

    const hashed = await hashPassword(password);
    const docsString = documents ? JSON.stringify(documents) : null;

    await queryDb(
      `INSERT INTO users (username, password, fullName, email, phone, roleId, zoneId, gender, birthDate, joinDate, address, country, province, city, district, village, postalCode, photoUrl, documents, status, createdAt, updatedAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6), NOW(6))`,
      [
        finalUsername, 
        hashed, 
        fullName, 
        email || null, 
        phone || null, 
        roleId, 
        zoneId || null, 
        gender || null, 
        birthDate || null, 
        joinDate || null, 
        address || null, 
        country || null,
        province || null, 
        city || null, 
        district || null, 
        village || null, 
        postalCode || null,
        photoUrl || null,
        docsString,
        status || 'ACTIVE'
      ]
    );

    emitUserChange('create', { username: finalUsername, fullName });
    return NextResponse.json({ message: 'User berhasil dibuat', username: finalUsername }, { status: 201 });
  } catch (err: any) {
    console.error('[POST /api/users] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

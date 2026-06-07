import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbConnection } from '@/lib/db';
import { emitReportChange } from '@/lib/socket-emit';
import type { Connection, ResultSetHeader, RowDataPacket } from 'mysql2/promise';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

type ColumnInfo = {
  Field: string;
  Type: string;
  Null: 'YES' | 'NO';
  Key: string;
  Default: unknown;
  Extra: string;
};

type SqlValue = string | number | boolean | null | Date | Buffer;

async function getColumnsByName(conn: Connection, tableName: string): Promise<Record<string, ColumnInfo>> {
  const [rows] = await conn.execute<RowDataPacket[]>(`SHOW COLUMNS FROM \`${tableName}\``);
  const map: Record<string, ColumnInfo> = {};
  for (const row of rows || []) {
    const r = row as unknown as ColumnInfo;
    map[r.Field] = r;
  }
  return map;
}

function resolveColumn(columns: Record<string, ColumnInfo>, candidates: string[]): string | null {
  for (const c of candidates) {
    if (columns[c]) return c;
  }
  return null;
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const conn = (await getDbConnection()) as unknown as Connection;
    try {
      const reportCols = await getColumnsByName(conn, 'reports');
      const userCols = await getColumnsByName(conn, 'users');

      const reportUserIdCol = resolveColumn(reportCols, ['userId', 'user_id']);
      const reportCategoryCol = resolveColumn(reportCols, ['category']);
      const reportTitleCol = resolveColumn(reportCols, ['title']);
      const reportDescriptionCol = resolveColumn(reportCols, ['description']);
      const reportLatCol = resolveColumn(reportCols, ['lat']);
      const reportLngCol = resolveColumn(reportCols, ['lng']);
      const reportAddressCol = resolveColumn(reportCols, ['address']);
      const reportPriorityCol = resolveColumn(reportCols, ['priority']);
      const reportStatusCol = resolveColumn(reportCols, ['status']);
      const reportCreatedAtCol = resolveColumn(reportCols, ['createdAt', 'created_at']);
      const reportUpdatedAtCol = resolveColumn(reportCols, ['updatedAt', 'updated_at']);

      const userFullNameCol = resolveColumn(userCols, ['fullName', 'full_name']);

      if (!reportUserIdCol || !reportTitleCol) {
        return NextResponse.json({ error: 'Skema tabel reports tidak sesuai' }, { status: 500 });
      }

      const selectParts = [
        `r.id AS id`,
        `r.\`${reportUserIdCol}\` AS userId`,
        reportCategoryCol ? `r.\`${reportCategoryCol}\` AS category` : `NULL AS category`,
        `r.\`${reportTitleCol}\` AS title`,
        reportDescriptionCol ? `r.\`${reportDescriptionCol}\` AS description` : `NULL AS description`,
        reportLatCol ? `r.\`${reportLatCol}\` AS lat` : `NULL AS lat`,
        reportLngCol ? `r.\`${reportLngCol}\` AS lng` : `NULL AS lng`,
        reportAddressCol ? `r.\`${reportAddressCol}\` AS address` : `NULL AS address`,
        reportPriorityCol ? `r.\`${reportPriorityCol}\` AS priority` : `NULL AS priority`,
        reportStatusCol ? `r.\`${reportStatusCol}\` AS status` : `NULL AS status`,
        reportCreatedAtCol ? `r.\`${reportCreatedAtCol}\` AS createdAt` : `NULL AS createdAt`,
        reportUpdatedAtCol ? `r.\`${reportUpdatedAtCol}\` AS updatedAt` : `NULL AS updatedAt`,
        userFullNameCol ? `u.\`${userFullNameCol}\` AS userName` : `NULL AS userName`,
      ];

      const [rows] = await conn.execute<RowDataPacket[]>(
        `
          SELECT ${selectParts.join(', ')}
          FROM reports r
          JOIN users u ON u.id = r.\`${reportUserIdCol}\`
          WHERE r.id = ?
          LIMIT 1
        `,
        [id],
      );

      const row = (rows || [])[0] as any;
      if (!row) return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });

      let photos: RowDataPacket[] = [];
      let photoCols: Record<string, ColumnInfo> = {};
      try {
        photoCols = await getColumnsByName(conn, 'report_photos');
      } catch {
        photoCols = {};
      }

      const photoReportIdCol = resolveColumn(photoCols, ['reportId', 'report_id']);
      const photoUrlCol = resolveColumn(photoCols, ['photoUrl', 'photo_url', 'url']);
      const photoCreatedAtCol = resolveColumn(photoCols, ['createdAt', 'created_at']);

      if (photoReportIdCol && photoUrlCol) {
        const photoSelect = [
          `id AS id`,
          `\`${photoReportIdCol}\` AS reportId`,
          `\`${photoUrlCol}\` AS photoUrl`,
          photoCreatedAtCol ? `\`${photoCreatedAtCol}\` AS createdAt` : `NULL AS createdAt`,
        ];
        const [p] = await conn.execute<RowDataPacket[]>(
          `SELECT ${photoSelect.join(', ')} FROM report_photos WHERE \`${photoReportIdCol}\` = ?`,
          [id],
        );
        photos = p || [];
      }

      return NextResponse.json({
        ...row,
        photos,
        user: { id: row.userId ?? null, fullName: row.userName ?? null },
      });
    } finally {
      await conn.end();
    }
  } catch (err: any) {
    console.error('[GET /api/reports/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const role = String((decoded as any).role || '');
    const requesterId = (decoded as any).sub;

    const conn = (await getDbConnection()) as unknown as Connection;
    try {
      if (role && role !== 'ADMIN') {
        try {
          const [sRows] = await conn.execute<RowDataPacket[]>(
            'SELECT rolePermissions FROM system_settings LIMIT 1',
          );
          const raw = (sRows || [])[0]?.rolePermissions;
          if (raw) {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            const canDelete = parsed?.[role]?.canDelete;
            if (canDelete === false) {
              return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
          }
        } catch {
          // If settings table/column is missing, default to allowing delete for non-admin roles.
        }
      }

      const reportCols = await getColumnsByName(conn, 'reports');
      const reportUserIdCol = resolveColumn(reportCols, ['userId', 'user_id']);
      if (!reportUserIdCol) {
        return NextResponse.json({ error: 'Skema tabel reports tidak sesuai' }, { status: 500 });
      }

      const [rows] = await conn.execute<RowDataPacket[]>(
        `SELECT id, \`${reportUserIdCol}\` AS userId FROM reports WHERE id = ? LIMIT 1`,
        [id],
      );
      const found = (rows || [])[0] as any;
      if (!found) return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });

      const isAdminOrStaff = role === 'ADMIN' || role === 'STAFF';
      if (!isAdminOrStaff && String(found.userId) !== String(requesterId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      await conn.beginTransaction();
      try {
        let photoCols: Record<string, ColumnInfo> = {};
        try {
          photoCols = await getColumnsByName(conn, 'report_photos');
        } catch {
          photoCols = {};
        }
        const photoReportIdCol = resolveColumn(photoCols, ['reportId', 'report_id']);
        if (photoReportIdCol) {
          await conn.execute<ResultSetHeader>(
            `DELETE FROM report_photos WHERE \`${photoReportIdCol}\` = ?`,
            [id as unknown as SqlValue],
          );
        }

        await conn.execute<ResultSetHeader>(`DELETE FROM reports WHERE id = ?`, [id as unknown as SqlValue]);
        await conn.commit();
      } catch (e) {
        await conn.rollback();
        throw e;
      }

      emitReportChange('delete', { id: Number(id) });
      return NextResponse.json({ message: 'Laporan berhasil dihapus' });
    } finally {
      await conn.end();
    }
  } catch (err: any) {
    console.error('[DELETE /api/reports/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

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
type ReportListRow = RowDataPacket & {
  id: number;
  userId: number | string | null;
  userName: string | null;
  photos?: RowDataPacket[];
};

async function getColumnsByName(conn: Connection, tableName: string): Promise<Record<string, ColumnInfo>> {
  const [rows] = await conn.execute<RowDataPacket[]>(`SHOW COLUMNS FROM \`${tableName}\``);
  const map: Record<string, ColumnInfo> = {};
  for (const row of rows || []) {
    const r = row as unknown as ColumnInfo;
    map[r.Field] = r;
  }
  return map;
}

function resolveColumn(
  columns: Record<string, ColumnInfo>,
  candidates: string[],
): string | null {
  for (const c of candidates) {
    if (columns[c]) return c;
  }
  return null;
}

function parseEnumValues(typeStr: string): string[] {
  const lower = String(typeStr || '').toLowerCase();
  if (!lower.startsWith('enum(')) return [];
  const inner = typeStr.slice(5, -1);
  const out: string[] = [];
  const re = /'((?:\\'|[^'])*)'/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(inner))) {
    out.push(m[1].replace(/\\'/g, "'"));
  }
  return out;
}

function pickStatusValue(typeStr: string): string | null {
  const allowed = parseEnumValues(typeStr);
  if (allowed.length === 0) return 'PENDING';
  if (allowed.includes('PENDING')) return 'PENDING';
  if (allowed.includes('NEW')) return 'NEW';
  return null;
}

function normalizePriority(value: any, typeStr: string): string | null {
  const v = String(value || '').trim();
  if (!v) return null;
  const upper = v.toUpperCase();
  const allowed = parseEnumValues(typeStr);
  if (allowed.length === 0) return upper;
  if (allowed.includes(upper)) return upper;
  return null;
}

export async function GET(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const mine = url.searchParams.get('mine') === '1';

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

      const orderCol = reportCreatedAtCol ? `r.\`${reportCreatedAtCol}\`` : 'r.id';
      const whereClause = mine ? `WHERE r.\`${reportUserIdCol}\` = ?` : '';
      const sql = `
        SELECT ${selectParts.join(', ')}
        FROM reports r
        JOIN users u ON u.id = r.\`${reportUserIdCol}\`
        ${whereClause}
        ORDER BY ${orderCol} DESC
      `;

      const [rowsRaw] = mine
        ? await conn.execute<RowDataPacket[]>(sql, [decoded.sub])
        : await conn.execute<RowDataPacket[]>(sql);
      const rows = rowsRaw as unknown as ReportListRow[];

      const reportIds = (rows || [])
        .map((r) => r.id)
        .filter((id): id is number => typeof id === 'number' && Number.isFinite(id));
      if (reportIds.length > 0) {
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
          const [photos] = await conn.execute<RowDataPacket[]>(
            `SELECT ${photoSelect.join(', ')} FROM report_photos WHERE \`${photoReportIdCol}\` IN (${reportIds
              .map(() => '?')
              .join(',')})`,
            reportIds,
          );

          const photosByReport: Record<number, RowDataPacket[]> = {};
          for (const p of photos || []) {
            const rid = Number(p.reportId);
            if (!photosByReport[rid]) photosByReport[rid] = [];
            photosByReport[rid].push(p);
          }
          for (const r of rows || []) {
            r.photos = photosByReport[Number(r.id)] || [];
          }
        } else {
          for (const r of rows || []) r.photos = [];
        }
      } else {
        for (const r of rows || []) r.photos = [];
      }

      const normalized = (rows || []).map((r) => ({
        ...r,
        user: { id: r.userId ?? null, fullName: r.userName ?? null },
      }));

      return NextResponse.json(normalized);
    } finally {
      await conn.end();
    }
  } catch (err: any) {
    console.error('[GET /api/reports] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const { type, category, title, description, lat, lng, address, urgency, priority, photos } = data;
    const userId = decoded.sub;

    const conn = (await getDbConnection()) as unknown as Connection;
    try {
      await conn.execute(`
        CREATE TABLE IF NOT EXISTS reports (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          category VARCHAR(50) DEFAULT 'GENERAL',
          title VARCHAR(255) NOT NULL,
          description TEXT,
          lat DECIMAL(10,8) DEFAULT NULL,
          lng DECIMAL(11,8) DEFAULT NULL,
          address TEXT,
          priority VARCHAR(20) DEFAULT 'MEDIUM',
          status VARCHAR(20) DEFAULT 'PENDING',
          created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
          updated_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
          INDEX idx_user_id (user_id),
          INDEX idx_created_at (created_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      await conn.execute(`
        CREATE TABLE IF NOT EXISTS report_photos (
          id BIGINT AUTO_INCREMENT PRIMARY KEY,
          report_id BIGINT NOT NULL,
          photo_url LONGTEXT,
          created_at DATETIME(6) DEFAULT CURRENT_TIMESTAMP(6),
          INDEX idx_report_id (report_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `);

      const reportCols = await getColumnsByName(conn, 'reports');
      const photoCols = await getColumnsByName(conn, 'report_photos');

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

      if (!reportUserIdCol || !reportTitleCol) {
        return NextResponse.json({ error: 'Skema tabel reports tidak sesuai' }, { status: 500 });
      }

      const finalCategory = String(category || type || 'GENERAL');
      const finalPriorityCandidate = String(priority || urgency || 'MEDIUM');

      const insertCols: string[] = [];
      const placeholders: string[] = [];
      const values: SqlValue[] = [];

      insertCols.push(`\`${reportUserIdCol}\``);
      placeholders.push('?');
      values.push(userId);

      if (reportCategoryCol) {
        insertCols.push(`\`${reportCategoryCol}\``);
        placeholders.push('?');
        values.push(finalCategory);
      }

      insertCols.push(`\`${reportTitleCol}\``);
      placeholders.push('?');
      values.push(title);

      if (reportDescriptionCol) {
        insertCols.push(`\`${reportDescriptionCol}\``);
        placeholders.push('?');
        values.push(description || '');
      }
      if (reportLatCol) {
        insertCols.push(`\`${reportLatCol}\``);
        placeholders.push('?');
        values.push(lat ?? null);
      }
      if (reportLngCol) {
        insertCols.push(`\`${reportLngCol}\``);
        placeholders.push('?');
        values.push(lng ?? null);
      }
      if (reportAddressCol) {
        insertCols.push(`\`${reportAddressCol}\``);
        placeholders.push('?');
        values.push(address ?? null);
      }
      if (reportPriorityCol) {
        const normalized = normalizePriority(finalPriorityCandidate, reportCols[reportPriorityCol]?.Type);
        if (normalized != null) {
          insertCols.push(`\`${reportPriorityCol}\``);
          placeholders.push('?');
          values.push(normalized);
        }
      }
      if (reportStatusCol) {
        const statusVal = pickStatusValue(reportCols[reportStatusCol]?.Type);
        if (statusVal != null) {
          insertCols.push(`\`${reportStatusCol}\``);
          placeholders.push('?');
          values.push(statusVal);
        }
      }
      if (reportCreatedAtCol) {
        insertCols.push(`\`${reportCreatedAtCol}\``);
        placeholders.push('NOW(6)');
      }
      if (reportUpdatedAtCol) {
        insertCols.push(`\`${reportUpdatedAtCol}\``);
        placeholders.push('NOW(6)');
      }

      const [result] = await conn.execute<ResultSetHeader>(
        `INSERT INTO reports (${insertCols.join(', ')}) VALUES (${placeholders.join(', ')})`,
        values,
      );

      const reportId = result.insertId;

      // Save photos
      if (photos && Array.isArray(photos) && photos.length > 0) {
        const photoReportIdCol = resolveColumn(photoCols, ['reportId', 'report_id']);
        const photoUrlCol = resolveColumn(photoCols, ['photoUrl', 'photo_url', 'url']);
        const photoCreatedAtCol = resolveColumn(photoCols, ['createdAt', 'created_at']);

        for (const base64Photo of photos) {
          if (!photoReportIdCol || !photoUrlCol) continue;
          const pCols: string[] = [`\`${photoReportIdCol}\``, `\`${photoUrlCol}\``];
          const pPlaceholders: string[] = ['?', '?'];
          const pValues: SqlValue[] = [reportId, base64Photo];
          if (photoCreatedAtCol) {
            pCols.push(`\`${photoCreatedAtCol}\``);
            pPlaceholders.push('NOW(6)');
          }
          await conn.execute(
            `INSERT INTO report_photos (${pCols.join(', ')}) VALUES (${pPlaceholders.join(', ')})`,
            pValues,
          );
        }
      }

      emitReportChange('create', { id: reportId });
      return NextResponse.json({ id: reportId, message: 'Laporan berhasil dibuat' }, { status: 201 });
    } finally {
      await conn.end();
    }
  } catch (err: any) {
    console.error('[POST /api/reports] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

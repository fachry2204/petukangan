import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { queryDb, getDbConnection } from '@/lib/db';


export async function GET(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows: any = await queryDb(
      `SELECT r.*, u.fullName as userName FROM reports r JOIN users u ON u.id = r.userId ORDER BY r.createdAt DESC`
    );

    // Fetch photos for each report
    const reportIds = rows.map((r: any) => r.id);
    if (reportIds.length > 0) {
      const photos: any = await queryDb(
        `SELECT * FROM report_photos WHERE reportId IN (${reportIds.map(() => '?').join(',')})`,
        reportIds
      );
      const photosByReport: Record<number, any[]> = {};
      for (const p of photos) {
        if (!photosByReport[p.reportId]) photosByReport[p.reportId] = [];
        photosByReport[p.reportId].push(p);
      }
      for (const r of rows) {
        r.photos = photosByReport[r.id] || [];
      }
    }

    return NextResponse.json(rows || []);
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
    const { type, title, description, lat, lng, address, urgency, photos } = data;
    const userId = decoded.sub;

    const conn = await getDbConnection();
    try {
      const [result]: any = await conn.execute(
        `INSERT INTO reports (userId, category, title, description, lat, lng, address, priority, status, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', NOW(6), NOW(6))`,
        [userId, type, title, description || '', lat || null, lng || null, address || null, urgency || 'MEDIUM']
      );

      const reportId = result.insertId;

      // Save photos
      if (photos && Array.isArray(photos) && photos.length > 0) {
        for (const base64Photo of photos) {
          // For now, store base64 directly. In production, save to filesystem.
          await conn.execute(
            `INSERT INTO report_photos (reportId, photoUrl, createdAt) VALUES (?, ?, NOW(6))`,
            [reportId, base64Photo]
          );
        }
      }

      return NextResponse.json({ id: reportId, message: 'Laporan berhasil dibuat' }, { status: 201 });
    } finally {
      await conn.end();
    }
  } catch (err: any) {
    console.error('[POST /api/reports] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

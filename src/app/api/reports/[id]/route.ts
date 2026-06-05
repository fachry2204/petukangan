import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
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
      `SELECT r.*, u.fullName as userName FROM reports r JOIN users u ON u.id = r.userId WHERE r.id = ?`,
      [id]
    );
    if (!rows?.[0]) return NextResponse.json({ error: 'Laporan tidak ditemukan' }, { status: 404 });

    const photos: any = await queryDb(
      `SELECT * FROM report_photos WHERE reportId = ?`,
      [id]
    );

    return NextResponse.json({ ...rows[0], photos: photos || [] });
  } catch (err: any) {
    console.error('[GET /api/reports/:id] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

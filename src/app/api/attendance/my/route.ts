import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export async function GET(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const userId = decoded.sub;

    // Get all attendance records for this user
    const regular: any = await queryDb(
      `SELECT a.*, u.fullName as userName FROM attendance a JOIN users u ON u.id = a.userId WHERE a.userId = ? ORDER BY a.timestamp DESC`,
      [userId]
    );

    const lembur: any = await queryDb(
      `SELECT l.*, u.fullName as userName FROM lembur l JOIN users u ON u.id = l.userId WHERE l.userId = ? ORDER BY l.timestamp DESC`,
      [userId]
    );

    // Combine both tables into unified format
    const all = [
      ...(regular || []).map((r: any) => ({ ...r, source: 'attendance' })),
      ...(lembur || []).map((r: any) => ({ ...r, source: 'lembur' })),
    ];

    all.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return NextResponse.json(all);
  } catch (err: any) {
    console.error('[GET /api/attendance/my] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

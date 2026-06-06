import { NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/auth';
import { queryDb } from '@/lib/db';


export async function POST(req: Request) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const userId = Number(data.userId);

    if (!userId) {
      return NextResponse.json({ error: 'userId wajib diisi' }, { status: 400 });
    }

    await queryDb('DELETE FROM gps_tracking WHERE userId = ?', [userId]);

    return NextResponse.json({ message: 'Petugas berhasil di-logout', userId });
  } catch (err: any) {
    console.error('[POST /api/tracking/offline] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

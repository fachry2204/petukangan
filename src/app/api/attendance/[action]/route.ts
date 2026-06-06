import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getDbConnection } from '@/lib/db';
import { emitAttendanceChange } from '@/lib/socket-emit';

function getUserFromToken(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  return verifyToken(token);
}

export async function POST(req: Request, context: { params: Promise<{ action: string }> }) {
  let actionStr = 'unknown';
  try {
    const { action } = await context.params;
    actionStr = action;
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const data = await req.json();
    const userId = decoded.sub;

    const typeMap: Record<string, string> = {
      'check-in': 'IN',
      'check-out': 'OUT',
      'break': 'BREAK',
      'end-break': 'END_BREAK',
      'permit': 'PERMIT',
      'early-out': 'EARLY_OUT',
    };

    const type = typeMap[action];
    if (!type) {
      return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
    }

    const conn = await getDbConnection();
    try {
      // Check if there is an approved request today (in Asia/Jakarta timezone!)
      const now = new Date();
      const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // add 7 hours
      wibTime.setUTCHours(0, 0, 0, 0);
      const todayStr = wibTime.toISOString().split('T')[0];

      const [requests]: any = await conn.execute(
        `SELECT * FROM attendance_requests WHERE userId = ? AND DATE(timestamp) = ? AND status = 'APPROVED' ORDER BY id DESC LIMIT 1`,
        [userId, todayStr]
      );
      const hasApprovedRequest = requests?.[0];

      // Determine table to insert
      const table = hasApprovedRequest ? 'lembur' : 'attendance';
      const isPermitType = ['PERMIT', 'EARLY_OUT'].includes(type);
      const status = isPermitType ? 'PENDING' : 'VALID';

      await conn.execute(
        `INSERT INTO ${table} (userId, type, lat, lng, address, photoUrl, deviceInfo, isMock, status, reason, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
        [
          userId,
          type,
          data.lat != null ? data.lat : 0, // if null/undefined use 0 instead of null to avoid NOT NULL error
          data.lng != null ? data.lng : 0,
          data.address || (type === 'PERMIT' ? 'Pengajuan Izin Tidak Masuk' : 'Pengajuan Pulang Awal'),
          data.photoUrl || null,
          data.deviceInfo || null,
          data.isMock != null ? data.isMock : false,
          status,
          data.reason || null,
        ]
      );

      emitAttendanceChange('create', { userId, type, status });
      return NextResponse.json({ message: 'Absensi berhasil disimpan', type, status });
    } finally {
      await conn.end();
    }
  } catch (err: any) {
    console.error(`[POST /api/attendance/${actionStr}] error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

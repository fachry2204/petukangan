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

export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    const decoded = getUserFromToken(req);
    if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { action } = await params;
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
      // Check if there is an approved request today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];

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
          data.lat || null,
          data.lng || null,
          data.address || (type === 'PERMIT' ? 'Pengajuan Izin Tidak Masuk' : 'Pengajuan Pulang Awal'),
          data.photoUrl || null,
          data.deviceInfo || null,
          data.isMock || false,
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
    console.error(`[POST /api/attendance/${(await params).action}] error:`, err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

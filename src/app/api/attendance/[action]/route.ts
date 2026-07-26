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
      'request': 'REQUEST',
    };

    const type = typeMap[action];
    if (!type) {
      return NextResponse.json({ error: 'Action tidak valid' }, { status: 400 });
    }

    const conn = await getDbConnection();
    try {
      // Check if there is an approved request that is currently active and unclosed
      const now = new Date();
      const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // add 7 hours
      wibTime.setUTCHours(0, 0, 0, 0);
      const todayStr = wibTime.toISOString().split('T')[0];
      const yesterdayStr = new Date(wibTime.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const [requests]: any = await conn.execute(
        `SELECT * FROM attendance_requests WHERE userId = ? AND DATE(timestamp) >= ? AND status = 'APPROVED' ORDER BY id DESC LIMIT 1`,
        [userId, yesterdayStr]
      );
      const approvedReq = requests?.[0];

      let hasApprovedRequest = false;
      if (approvedReq) {
        const reqDateStr = new Date(approvedReq.timestamp).toISOString().split('T')[0];

        const [regOuts]: any = await conn.execute(
          `SELECT id FROM attendance WHERE userId = ? AND type IN ('OUT', 'EARLY_OUT') AND timestamp >= ? LIMIT 1`,
          [userId, approvedReq.timestamp]
        );
        const [lemOuts]: any = await conn.execute(
          `SELECT id FROM lembur WHERE userId = ? AND type IN ('OUT', 'EARLY_OUT') AND timestamp >= ? LIMIT 1`,
          [userId, approvedReq.timestamp]
        );

        if (regOuts.length === 0 && lemOuts.length === 0 && (reqDateStr === todayStr || reqDateStr === yesterdayStr)) {
          hasApprovedRequest = true;
        }
      }

      // Determine table to insert
      if (type === 'REQUEST') {
        await conn.execute(
          `INSERT INTO attendance_requests (userId, lat, lng, address, reason, status, timestamp)
           VALUES (?, ?, ?, ?, ?, 'PENDING', NOW(6))`,
          [
            userId,
            data.lat != null ? data.lat : 0,
            data.lng != null ? data.lng : 0,
            data.address || 'Pengajuan Absen Luar Jadwal',
            data.reason || null,
          ]
        );
        emitAttendanceChange('create', { userId, type: 'IN', status: 'PENDING', isRequestTable: true });
        return NextResponse.json({ message: 'Permintaan absen berhasil dikirim', type, status: 'PENDING' });
      }

      let table = 'attendance';
      if (type === 'IN' || type === 'PERMIT') {
        table = hasApprovedRequest ? 'lembur' : 'attendance';
      } else {
        // For check-out, break, end-break, early-out: locate the exact table with the LATEST unclosed IN session!
        const [lastRegIn]: any = await conn.execute(
          `SELECT id, timestamp FROM attendance WHERE userId = ? AND type = 'IN' AND status != 'PENDING' ORDER BY id DESC LIMIT 1`,
          [userId]
        );
        const [lastLemIn]: any = await conn.execute(
          `SELECT id, timestamp FROM lembur WHERE userId = ? AND type = 'IN' AND status != 'PENDING' ORDER BY id DESC LIMIT 1`,
          [userId]
        );

        const regInTime = lastRegIn?.[0] ? new Date(lastRegIn[0].timestamp).getTime() : 0;
        const lemInTime = lastLemIn?.[0] ? new Date(lastLemIn[0].timestamp).getTime() : 0;

        let regIsOpen = false;
        if (regInTime > 0) {
          const [regOut]: any = await conn.execute(
            `SELECT id FROM attendance WHERE userId = ? AND type IN ('OUT', 'EARLY_OUT') AND timestamp >= ? LIMIT 1`,
            [userId, lastRegIn[0].timestamp]
          );
          regIsOpen = regOut.length === 0;
        }

        let lemIsOpen = false;
        if (lemInTime > 0) {
          const [lemOut]: any = await conn.execute(
            `SELECT id FROM lembur WHERE userId = ? AND type IN ('OUT', 'EARLY_OUT') AND timestamp >= ? LIMIT 1`,
            [userId, lastLemIn[0].timestamp]
          );
          lemIsOpen = lemOut.length === 0;
        }

        if (lemIsOpen && !regIsOpen) {
          table = 'lembur';
        } else if (regIsOpen && !lemIsOpen) {
          table = 'attendance';
        } else if (lemIsOpen && regIsOpen) {
          table = lemInTime >= regInTime ? 'lembur' : 'attendance';
        } else {
          table = hasApprovedRequest ? 'lembur' : 'attendance';
        }
      }

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

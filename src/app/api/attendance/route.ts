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
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Get today's attendance records
    const regular: any = await queryDb(
      `SELECT a.*, u.fullName as userName FROM attendance a JOIN users u ON u.id = a.userId WHERE a.userId = ? AND DATE(a.timestamp) = ? ORDER BY a.id ASC`,
      [userId, todayStr]
    );

    const lembur: any = await queryDb(
      `SELECT l.*, u.fullName as userName FROM lembur l JOIN users u ON u.id = l.userId WHERE l.userId = ? AND DATE(l.timestamp) = ? ORDER BY l.id ASC`,
      [userId, todayStr]
    );

    const requests: any = await queryDb(
      `SELECT * FROM attendance_requests WHERE userId = ? AND DATE(timestamp) = ? ORDER BY id DESC`,
      [userId, todayStr]
    );

    const latestRequest = requests?.[0];
    const hasApprovedRequest = latestRequest && latestRequest.status === 'APPROVED';
    const hasPendingRequest = latestRequest && latestRequest.status === 'PENDING';
    const rejectedRequest = latestRequest && latestRequest.status === 'REJECTED' ? latestRequest : null;

    let records = hasApprovedRequest ? lembur : regular;
    const hasIn = records.some((r: any) => r.type === 'IN' && r.status !== 'PENDING');
    const hasBreak = records.some((r: any) => r.type === 'BREAK');
    const hasEndBreak = records.some((r: any) => r.type === 'END_BREAK');
    const hasOut = records.some((r: any) => r.type === 'OUT');
    const hasPermit = records.some((r: any) => r.type === 'PERMIT');
    const hasEarlyOut = records.some((r: any) => r.type === 'EARLY_OUT');

    let status = 'Belum Absen';
    if (hasPendingRequest) status = 'Menunggu Diterima';
    else if (hasPermit) {
      const p = records.find((r: any) => r.type === 'PERMIT');
      status = p && p.status === 'REJECTED' ? 'Belum Absen' : 'Izin Tidak Masuk';
    } else if (hasEarlyOut) {
      const eo = records.find((r: any) => r.type === 'EARLY_OUT');
      if (eo && eo.status === 'REJECTED') {
        if (hasEndBreak) status = 'Selesai Istirahat';
        else if (hasBreak) status = 'Absen Istirahat';
        else status = 'Sudah Absen';
      } else {
        status = 'Pulang Awal';
      }
    } else if (hasOut) status = 'Sudah Absen Pulang';
    else if (hasEndBreak) status = 'Selesai Istirahat';
    else if (hasBreak) status = 'Absen Istirahat';
    else if (hasIn) status = 'Sudah Absen';

    return NextResponse.json({ status, records, hasApprovedRequest: !!hasApprovedRequest, rejectedRequest });
  } catch (err: any) {
    console.error('[GET /api/attendance] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

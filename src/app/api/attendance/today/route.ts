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
    // Adjust to WIB (UTC+7) for correct "today" in Jakarta timezone
    const now = new Date();
    const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // tambahkan 7 jam ke UTC time
    wibTime.setUTCHours(0, 0, 0, 0);
    const todayStr = wibTime.toISOString().split('T')[0];

    // Check approved request
    const requests: any = await queryDb(
      `SELECT * FROM attendance_requests WHERE userId = ? AND DATE(timestamp) = ? ORDER BY id DESC`,
      [userId, todayStr]
    );

    const latestRequest = requests?.[0];
    const hasApprovedRequest = latestRequest && latestRequest.status === 'APPROVED';
    const hasPendingRequest = latestRequest && latestRequest.status === 'PENDING';
    const rejectedRequest = latestRequest && latestRequest.status === 'REJECTED' ? latestRequest : null;

    // Get records
    const regular: any = await queryDb(
      `SELECT * FROM attendance WHERE userId = ? AND DATE(timestamp) = ? ORDER BY id ASC`,
      [userId, todayStr]
    );

    const lembur: any = await queryDb(
      `SELECT * FROM lembur WHERE userId = ? AND DATE(timestamp) = ? ORDER BY id ASC`,
      [userId, todayStr]
    );

    let records = hasApprovedRequest ? lembur : regular;
    const hasIn = records.some((r: any) => r.type === 'IN' && r.status !== 'PENDING');
    const hasBreak = records.some((r: any) => r.type === 'BREAK');
    const hasEndBreak = records.some((r: any) => r.type === 'END_BREAK');
    const hasOut = records.some((r: any) => r.type === 'OUT');
    const permitRecord = records.find((r: any) => r.type === 'PERMIT');
    const earlyOutRecord = records.find((r: any) => r.type === 'EARLY_OUT');
    const hasPermit = !!permitRecord;
    const hasEarlyOut = !!earlyOutRecord;

    let status = 'Belum Absen';
    let izinStatus = null; // 'PENDING', 'APPROVED', 'REJECTED'
    let izinType = null; // 'PERMIT', 'EARLY_OUT'

    if (hasPendingRequest) status = 'Menunggu Diterima';
    else if (hasPermit) {
      izinStatus = permitRecord.status;
      izinType = 'PERMIT';
      if (permitRecord.status === 'REJECTED') {
        status = 'Belum Absen';
      } else {
        status = 'Izin Tidak Masuk';
      }
    } else if (hasEarlyOut) {
      izinStatus = earlyOutRecord.status;
      izinType = 'EARLY_OUT';
      if (earlyOutRecord.status === 'REJECTED') {
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

    return NextResponse.json({ 
      status, 
      records, 
      hasApprovedRequest: !!hasApprovedRequest, 
      rejectedRequest,
      izinStatus,
      izinType
    });
  } catch (err: any) {
    console.error('[GET /api/attendance/today] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

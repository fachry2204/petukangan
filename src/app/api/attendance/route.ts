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
    // Adjust to WIB (UTC+7) for correct "today" and "yesterday" in Jakarta timezone
    const now = new Date();
    const wibNow = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    
    const todayWib = new Date(wibNow);
    todayWib.setUTCHours(0, 0, 0, 0);
    const todayStr = todayWib.toISOString().split('T')[0];

    const yesterdayWib = new Date(todayWib.getTime() - (24 * 60 * 60 * 1000));
    const yesterdayStr = yesterdayWib.toISOString().split('T')[0];

    // Check requests
    const requests: any = await queryDb(
      `SELECT * FROM attendance_requests WHERE userId = ? AND DATE(timestamp) >= ? ORDER BY id DESC`,
      [userId, yesterdayStr]
    );

    const latestRequest = requests?.[0];
    const todayRequest = (requests || []).find((r: any) => {
      const rDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : '';
      return rDate === todayStr;
    });

    const hasApprovedRequest = (todayRequest || latestRequest)?.status === 'APPROVED';
    const hasPendingRequest = (todayRequest || latestRequest)?.status === 'PENDING';
    const rejectedRequest = (todayRequest || latestRequest)?.status === 'REJECTED' ? (todayRequest || latestRequest) : null;

    // Get records from yesterday and today
    const regular: any = await queryDb(
      `SELECT a.*, u.fullName as userName FROM attendance a JOIN users u ON u.id = a.userId WHERE a.userId = ? AND DATE(a.timestamp) >= ? ORDER BY a.id ASC`,
      [userId, yesterdayStr]
    );

    const lembur: any = await queryDb(
      `SELECT l.*, u.fullName as userName FROM lembur l JOIN users u ON u.id = l.userId WHERE l.userId = ? AND DATE(l.timestamp) >= ? ORDER BY l.id ASC`,
      [userId, yesterdayStr]
    );

    // Helper to evaluate session records from a dataset
    const evaluateSession = (allRecords: any[]) => {
      if (!allRecords || allRecords.length === 0) return null;

      const inRecords = allRecords.filter((r: any) => r.type === 'IN' && r.status !== 'PENDING');
      if (inRecords.length === 0) {
        const todayRecords = allRecords.filter((r: any) => {
          const rDate = r.timestamp ? new Date(r.timestamp).toISOString().split('T')[0] : '';
          return rDate === todayStr;
        });
        if (todayRecords.length > 0) {
          return { records: todayRecords, isClosed: true, sessionDate: todayStr };
        }
        return null;
      }

      const lastIn = inRecords[inRecords.length - 1];
      const lastInTime = new Date(lastIn.timestamp).getTime();
      const inDateStr = new Date(lastIn.timestamp).toISOString().split('T')[0];

      const sessionRecords = allRecords.filter((r: any) => new Date(r.timestamp).getTime() >= lastInTime);
      const hasOut = sessionRecords.some((r: any) => r.type === 'OUT' || r.type === 'EARLY_OUT');

      if (!hasOut) {
        return { records: sessionRecords, isClosed: false, sessionDate: inDateStr };
      } else {
        const lastRecord = sessionRecords[sessionRecords.length - 1];
        const outDateStr = new Date(lastRecord.timestamp).toISOString().split('T')[0];
        if (inDateStr === todayStr || outDateStr === todayStr) {
          return { records: sessionRecords, isClosed: true, sessionDate: inDateStr };
        }
        return null;
      }
    };

    const regularSession = evaluateSession(regular);
    const lemburSession = evaluateSession(lembur);

    let activeSession = null;
    if (lemburSession && !lemburSession.isClosed) {
      activeSession = lemburSession;
    } else if (regularSession && !regularSession.isClosed) {
      activeSession = regularSession;
    } else if (hasApprovedRequest && lemburSession) {
      activeSession = lemburSession;
    } else if (regularSession) {
      activeSession = regularSession;
    } else if (lemburSession) {
      activeSession = lemburSession;
    }

    let records = activeSession?.records || [];
    let sessionDate = activeSession?.sessionDate || todayStr;

    const hasIn = records.some((r: any) => r.type === 'IN' && r.status !== 'PENDING');
    const hasBreak = records.some((r: any) => r.type === 'BREAK');
    const hasEndBreak = records.some((r: any) => r.type === 'END_BREAK');
    const hasOut = records.some((r: any) => r.type === 'OUT');
    const permitRecord = records.find((r: any) => r.type === 'PERMIT');
    const earlyOutRecord = records.find((r: any) => r.type === 'EARLY_OUT');
    const hasPermit = !!permitRecord;
    const hasEarlyOut = !!earlyOutRecord;

    let status = 'Belum Absen';
    if (hasPendingRequest && records.length === 0) status = 'Menunggu Diterima';
    else if (hasPermit) {
      status = permitRecord && permitRecord.status === 'REJECTED' ? 'Belum Absen' : 'Izin Tidak Masuk';
    } else if (hasEarlyOut) {
      if (earlyOutRecord && earlyOutRecord.status === 'REJECTED') {
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

    return NextResponse.json({ status, records, sessionDate, hasApprovedRequest: !!hasApprovedRequest, rejectedRequest });
  } catch (err: any) {
    console.error('[GET /api/attendance] error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

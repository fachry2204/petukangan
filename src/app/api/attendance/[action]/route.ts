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
      let settingsRows: any;
      try {
        [settingsRows] = await conn.execute('SELECT attendanceMode, shifts FROM system_settings LIMIT 1');
      } catch (error: any) {
        if (error?.code !== 'ER_BAD_FIELD_ERROR') throw error;
        try {
          await conn.execute("ALTER TABLE system_settings ADD COLUMN attendanceMode VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED'");
        } catch (migrationError: any) {
          if (migrationError?.code !== 'ER_DUP_FIELDNAME') throw migrationError;
        }
        [settingsRows] = await conn.execute('SELECT attendanceMode, shifts FROM system_settings LIMIT 1');
      }
      const attendanceMode = settingsRows?.[0]?.attendanceMode === 'FREE' ? 'FREE' : 'SCHEDULED';
      let selectedShiftName: string | null = null;
      let selectedShiftTimeRange: string | null = null;
      let scheduleMissing = false;

      // Check if there is an approved request that is currently active and unclosed
      const now = new Date();
      const wibTime = new Date(now.getTime() + (7 * 60 * 60 * 1000)); // add 7 hours
      wibTime.setUTCHours(0, 0, 0, 0);
      const todayStr = wibTime.toISOString().split('T')[0];
      const yesterdayStr = new Date(wibTime.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      if (type === 'IN') {
        if (attendanceMode === 'FREE') {
          let shifts = settingsRows?.[0]?.shifts || [];
          if (typeof shifts === 'string') {
            try { shifts = JSON.parse(shifts); } catch { shifts = []; }
          }
          const requestedName = String(data.shiftName || '').trim();
          const selected = Array.isArray(shifts) ? shifts.find((shift: any) =>
            (typeof shift === 'string' ? shift : shift?.name) === requestedName
          ) : null;
          if (!selected) {
            return NextResponse.json({ error: 'Pilih shift yang tersedia sebelum absen masuk.' }, { status: 400 });
          }
          selectedShiftName = requestedName;
          selectedShiftTimeRange = typeof selected === 'string'
            ? null
            : `${selected.startTime || '08:00'} - ${selected.endTime || '16:00'}`;
        } else {
          const [scheduleRows]: any = await conn.execute(
            `SELECT shiftName, timeRange, assignedUsers, DATE_FORMAT(date, '%Y-%m-%d') AS scheduleDate
             FROM schedules WHERE date IN (?, ?) ORDER BY date DESC, id DESC`,
            [todayStr, yesterdayStr]
          );
          const currentWibMinutes = (now.getUTCHours() * 60 + now.getUTCMinutes() + 420) % 1440;
          const schedule = (scheduleRows || []).find((row: any) => {
            let assigned = row.assignedUsers;
            if (typeof assigned === 'string') {
              try { assigned = JSON.parse(assigned); } catch { assigned = []; }
            }
            if (!Array.isArray(assigned) || !assigned.some((item: any) => String(item.id) === String(userId))) return false;
            if (!row.shiftName || String(row.shiftName).toLowerCase() === 'libur') return false;
            if (row.scheduleDate === todayStr) return true;
            const [start, end] = String(row.timeRange || '').split(' - ');
            if (!start || !end) return false;
            const startMinutes = Number(start.slice(0, 2)) * 60 + Number(start.slice(3, 5));
            const endMinutes = Number(end.slice(0, 2)) * 60 + Number(end.slice(3, 5));
            return startMinutes > endMinutes && currentWibMinutes <= endMinutes;
          });
          if (!schedule) {
            scheduleMissing = true;
          } else {
            selectedShiftName = schedule.shiftName;
            selectedShiftTimeRange = schedule.timeRange;
          }
        }
      }

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
          `SELECT * FROM attendance WHERE userId = ? AND type = 'IN' AND status != 'PENDING' ORDER BY id DESC LIMIT 1`,
          [userId]
        );
        const [lastLemIn]: any = await conn.execute(
          `SELECT * FROM lembur WHERE userId = ? AND type = 'IN' AND status != 'PENDING' ORDER BY id DESC LIMIT 1`,
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
        const activeIn = table === 'lembur' ? lastLemIn?.[0] : lastRegIn?.[0];
        selectedShiftName = activeIn?.shiftName || null;
        selectedShiftTimeRange = activeIn?.shiftTimeRange || null;
      }

      const isPermitType = ['PERMIT', 'EARLY_OUT'].includes(type);
      const status = isPermitType ? 'PENDING' : 'VALID';

      for (const column of ['shiftName', 'shiftTimeRange']) {
        const [found]: any = await conn.execute(
          'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
          [table, column]
        );
        if (!found.length) {
          try {
            await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${column} VARCHAR(100) NULL`);
          } catch (migrationError: any) {
            if (migrationError?.code !== 'ER_DUP_FIELDNAME') throw migrationError;
          }
        }
      }
      if (type === 'IN' && attendanceMode === 'SCHEDULED' && scheduleMissing && !hasApprovedRequest) {
        return NextResponse.json({ error: 'Anda tidak memiliki jadwal shift hari ini. Hubungi admin atau ajukan absen luar jadwal.' }, { status: 403 });
      }
      await conn.execute(
        `INSERT INTO ${table} (userId, type, lat, lng, address, photoUrl, deviceInfo, isMock, status, reason, shiftName, shiftTimeRange, timestamp)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(6))`,
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
          selectedShiftName,
          selectedShiftTimeRange,
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

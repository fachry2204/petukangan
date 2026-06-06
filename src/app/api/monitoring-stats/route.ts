import { NextResponse } from 'next/server';
import mysql from 'mysql2/promise';
import { verifyToken } from '@/lib/auth';

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'ppsu_monitoring',
};

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  let conn;
  try {
    conn = await mysql.createConnection(dbConfig);

    // 1. Jumlah jadwal yang sudah selesai hari ini
    const [selesaiRows] = await conn.query<any[]>(
      `SELECT COUNT(*) as total FROM schedules WHERE status = 'Selesai'`
    );
    const selesai = selesaiRows[0]?.total || 0;

    // 2. Total laporan yang masuk hari ini
    const [laporanRows] = await conn.query<any[]>(
      `SELECT COUNT(*) as total FROM reports WHERE DATE(createdAt) = CURDATE()`
    );
    const laporan = laporanRows[0]?.total || 0;

    // 3. Jumlah petugas PPSU yang absen hari ini
    // Absen = petugas PPSU yang tidak memiliki absensi masuk (type=IN) hari ini
    const [totalPpsuRows] = await conn.query<any[]>(
      `SELECT COUNT(*) as total FROM users u JOIN roles r ON r.id = u.roleId WHERE r.name = 'PPSU' AND u.status = 'ACTIVE'`
    );
    const totalPpsu = totalPpsuRows[0]?.total || 0;

    const [hadirRows] = await conn.query<any[]>(
      `SELECT COUNT(DISTINCT a.userId) as total FROM attendance a
       JOIN users u ON u.id = a.userId
       JOIN roles r ON r.id = u.roleId
       WHERE r.name = 'PPSU' AND a.type = 'IN' AND DATE(a.timestamp) = CURDATE()`
    );
    const hadir = hadirRows[0]?.total || 0;
    const absen = Math.max(0, totalPpsu - hadir);

    return NextResponse.json({ selesai, laporan, absen, totalPpsu });
  } catch (err: any) {
    console.error('[monitoring-stats] DB Error:', err.message);
    return NextResponse.json({ selesai: 0, laporan: 0, absen: 0, totalPpsu: 0 });
  } finally {
    if (conn) await conn.end();
  }
}

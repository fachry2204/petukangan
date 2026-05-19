import { NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';

export async function GET() {
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ppsu_monitoring'
    });

    const [rows] = await conn.query(`
      SELECT 
        id, 
        user_id as userId, 
        full_name as fullName, 
        date_sos as dateSos, 
        time_sos as timeSos, 
        lat, 
        lng, 
        address, 
        map_link as mapLink, 
        status, 
        created_at as timestamp 
      FROM sos_signals 
      ORDER BY created_at DESC 
      LIMIT 100
    `);
    await conn.end();

    return NextResponse.json(rows);
  } catch (error) {
    console.error('Failed to fetch SOS signals from DB:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId, status } = await req.json();
    
    if (!userId || !status) {
      return NextResponse.json({ error: 'Missing userId or status' }, { status: 400 });
    }

    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ppsu_monitoring'
    });

    let query = 'UPDATE sos_signals SET status = ? WHERE user_id = ? AND status != "SELESAI"';
    let params: any[] = [status, userId];

    if (status === 'SELESAI') {
      query = 'UPDATE sos_signals SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status != "SELESAI"';
    }

    await conn.query(query, params);
    await conn.end();

    return NextResponse.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    console.error('Failed to update SOS status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

export async function GET() {
  try {
    const rows = await queryDb(`
      SELECT 
        s.id, 
        s.user_id as userId, 
        s.full_name as fullName, 
        s.date_sos as dateSos, 
        s.time_sos as timeSos, 
        s.lat, 
        s.lng, 
        s.address, 
        s.map_link as mapLink, 
        s.status, 
        s.created_at as timestamp,
        u.photoUrl as photoUrl
      FROM sos_signals s
      LEFT JOIN users u ON s.user_id = u.id
      ORDER BY s.created_at DESC 
      LIMIT 100
    `);

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

    let query = 'UPDATE sos_signals SET status = ? WHERE user_id = ? AND status != "SELESAI"';
    const params: any[] = [status, userId];

    if (status === 'SELESAI') {
      query = 'UPDATE sos_signals SET status = ?, resolved_at = CURRENT_TIMESTAMP WHERE user_id = ? AND status != "SELESAI"';
    }

    await queryDb(query, params);

    return NextResponse.json({ success: true, message: `Status updated to ${status}` });
  } catch (error) {
    console.error('Failed to update SOS status:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const payload = await req.json();
    const dateObj = new Date(payload.timestamp || Date.now());
    const gmt7Date = new Date(dateObj.getTime() + (7 * 60 * 60 * 1000));
    const dateSos = gmt7Date.toISOString().split('T')[0];
    const timeSos = gmt7Date.toISOString().split('T')[1].split('.')[0];
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${payload.lat},${payload.lng}`;

    await queryDb(
      'INSERT INTO sos_signals (user_id, full_name, date_sos, time_sos, lat, lng, address, map_link, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        payload.userId || 0, 
        payload.fullName || 'Petugas Anonim', 
        dateSos, 
        timeSos, 
        payload.lat || 0, 
        payload.lng || 0, 
        payload.address || 'Alamat gagal diambil', 
        mapLink, 
        'DARURAT'
      ]
    );

    return NextResponse.json({ success: true, message: 'SOS signal saved successfully' });
  } catch (error) {
    console.error('Failed to save emergency signal to DB:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

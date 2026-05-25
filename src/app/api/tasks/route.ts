import { NextResponse } from 'next/server';
import * as mysql from 'mysql2/promise';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ppsu_monitoring'
    });

    const { title, description, lat, lng, deadline, priority, officerIds } = data;

    if (!title || !officerIds || officerIds.length === 0) {
      await conn.end();
      return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 });
    }

    const promises = officerIds.map((userId: number) => {
      // Create a task for each selected officer
      return conn.execute(
        `INSERT INTO tasks (title, description, lat, lng, assignedToId, status, priority, taskType, deadline, createdAt, updatedAt)
         VALUES (?, ?, ?, ?, ?, 'TODO', ?, 'ASSIGNED', ?, NOW(6), NOW(6))`,
        [title, description || '', lat || null, lng || null, userId, priority || 'MEDIUM', deadline || null]
      );
    });

    await Promise.all(promises);
    await conn.end();

    return NextResponse.json({ message: 'Tugas berhasil dibuat' }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating tasks:', error);
    return NextResponse.json({ error: 'Gagal membuat tugas: ' + error.message }, { status: 500 });
  }
}

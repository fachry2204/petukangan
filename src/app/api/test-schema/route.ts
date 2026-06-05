import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

export async function GET() {
  try {
    const tables = ['users', 'roles', 'tasks', 'task_logs', 'attendance', 'lembur', 'reports', 'report_photos', 'zones', 'schedules', 'attendance_requests', 'sos_signals'];
    const result: Record<string, string[]> = {};
    for (const table of tables) {
      try {
        const cols: any = await queryDb(`SHOW COLUMNS FROM ${table}`);
        result[table] = cols.map((c: any) => c.Field);
      } catch (e: any) {
        result[table] = ['ERROR: ' + e.message];
      }
    }
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

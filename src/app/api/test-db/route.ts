import { NextResponse } from 'next/server';
import { queryDb } from '@/lib/db';

export async function GET() {
  try {
    const users: any = await queryDb('SELECT COUNT(*) as count FROM users');
    const roles: any = await queryDb('SELECT COUNT(*) as count FROM roles');
    const tasks: any = await queryDb('SELECT COUNT(*) as count FROM tasks');
    const attendance: any = await queryDb('SELECT COUNT(*) as count FROM attendance');

    return NextResponse.json({
      dbConnected: true,
      users: users?.[0]?.count || 0,
      roles: roles?.[0]?.count || 0,
      tasks: tasks?.[0]?.count || 0,
      attendance: attendance?.[0]?.count || 0,
    });
  } catch (err: any) {
    return NextResponse.json({ dbConnected: false, error: err.message }, { status: 500 });
  }
}

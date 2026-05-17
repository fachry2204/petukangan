export type Role = 'ADMIN' | 'PIMPINAN' | 'STAFF' | 'PPSU';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  zoneId?: number;
  status: 'ACTIVE' | 'INACTIVE';
  lastSeen?: string;
  deviceId?: string;
}

export interface GPSLocation {
  lat: number;
  lng: number;
  speed?: number;
  batteryLevel?: number;
  isMock: boolean;
  timestamp: string;
}

export interface AttendanceRecord {
  id: number;
  userId: number;
  type: 'IN' | 'BREAK' | 'END_BREAK' | 'OUT';
  timestamp: string;
  lat: number;
  lng: number;
  address: string;
  photoUrl: string;
  isMock: boolean;
}

export type TaskStatus = 'NEW' | 'ON_WAY' | 'BEFORE' | 'WORKING' | 'DONE' | 'REJECTED' | 'REVISION';

export interface Task {
  id: number;
  title: string;
  description: string;
  zoneId: number;
  assignedTo: number;
  status: TaskStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  deadline: string;
}

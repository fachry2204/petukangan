// Helper for Next.js API routes to emit realtime events via Socket.io
// The Socket.io server instance is exposed as global.io by server.js

declare global {
  // eslint-disable-next-line no-var
  var io: any;
  // eslint-disable-next-line no-var
  var activeLocations: Map<string, any>;
}

export function emitDataChange(entity: string, action: 'create' | 'update' | 'delete', data: any) {
  const payload = {
    event: 'dataChange',
    data: { entity, action, data, timestamp: Date.now() }
  };
  
  if (global.io) {
    global.io.emit(payload.event, payload.data);
  } else {
    // In Next.js API routes, global.io might be undefined, so we fallback to internal HTTP call
    const port = process.env.PORT || 3000;
    fetch(`http://localhost:${port}/internal/socket-emit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => console.error('[SocketEmit] Failed to emit via HTTP:', err));
  }
}

export function emitTaskChange(action: 'create' | 'update' | 'delete', taskData: any) {
  emitDataChange('task', action, taskData);
}

export function emitReportChange(action: 'create' | 'update' | 'delete', reportData: any) {
  emitDataChange('report', action, reportData);
}

export function emitUserChange(action: 'create' | 'update' | 'delete', userData: any) {
  emitDataChange('user', action, userData);
}

export function emitAttendanceChange(action: 'create' | 'update', attendanceData: any) {
  emitDataChange('attendance', action, attendanceData);
}

export function emitScheduleChange(action: 'create' | 'update' | 'delete', scheduleData: any) {
  emitDataChange('schedule', action, scheduleData);
}

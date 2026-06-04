import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { WsJwtGuard } from './ws-jwt.guard';
import { TrackingService } from './tracking.service';

import * as mysql from 'mysql2/promise';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // In-memory cache to sync active officers for newly connected admins
  private activeLocations: Map<number, any> = new Map();
  private socketToUserId: Map<string, number | null> = new Map();

  constructor(private trackingService: TrackingService) {}

  async handleConnection(client: Socket) {
    console.log(`[Socket] Client connected: ${client.id}`);
    const auth = client.handshake.auth || {};
    const userInfo: any = {
      userId: auth.userId ?? null,
      fullName: auth.fullName || auth.username || 'Unknown',
      photoUrl: auth.photoUrl || null,
      lat: null,
      lng: null,
      gpsStatus: false,
      timestamp: Date.now(),
      ipAddress: client.handshake.headers['x-forwarded-for'] || client.handshake.address || 'Unknown',
      device: client.handshake.headers['user-agent'] || 'Unknown',
    };
    if (userInfo.userId !== null && userInfo.userId !== undefined) {
      this.activeLocations.set(userInfo.userId as number, userInfo);
      this.socketToUserId.set(client.id, userInfo.userId);
      this.server.emit('userOnline', userInfo);
    } else {
      // Do not store entries without a valid userId; just map socket to null for cleanup
      this.socketToUserId.set(client.id, null);
    }  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    const userId = this.socketToUserId.get(client.id);
    if (userId) {
      this.activeLocations.delete(userId);
      this.socketToUserId.delete(client.id);
      this.server.emit('userOffline', { userId });
    }
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(client: Socket, payload: any) {
    console.log(`[Socket] Received updateLocation from user:`, payload?.userId, 'coords:', payload?.lat, payload?.lng, 'gpsStatus:', payload?.gpsStatus);
    try {
      // 1. Safe Native Database Save (Silently fail if history table is missing)
      if (payload.lat != null && payload.lng != null) {
        try {
          const conn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'ppsu_monitoring'
          });
          await conn.query(
            'INSERT INTO gps_tracking (userId, lat, lng) VALUES (?, ?, ?)',
            [payload.userId, payload.lat, payload.lng]
          );
          await conn.end();
        } catch (dbErr) {
          // Ignore db save errors so live tracking still works
        }
      }

      // Preserve last-known coords if incoming payload has null/undefined coords.
      // This prevents heartbeat / status-only emits from wiping out the map marker.
      const prev = this.activeLocations.get(payload.userId) || {};
      const hasNewCoords = payload.lat != null && payload.lng != null;
      const finalLat = hasNewCoords ? payload.lat : prev.lat ?? null;
      const finalLng = hasNewCoords ? payload.lng : prev.lng ?? null;

      // Update memory state
      const locationData = {
        userId: payload.userId,
        fullName: payload.fullName ?? prev.fullName,
        photoUrl: payload.photoUrl ?? prev.photoUrl,
        status: payload.status || prev.status || 'Online',
        lat: finalLat,
        lng: finalLng,
        gpsStatus: hasNewCoords ? !!payload.gpsStatus : prev.gpsStatus ?? false,
        timestamp: payload.timestamp || Date.now(),
        ipAddress: client.handshake.headers['x-forwarded-for'] || client.handshake.address || 'Unknown',
        device: payload.device || prev.device || 'Unknown',
        os: payload.os || prev.os || 'Unknown',
        provider: payload.provider || prev.provider || '',
      };

      this.activeLocations.set(payload.userId, locationData);
      this.socketToUserId.set(client.id, payload.userId);

      console.log(`[Socket] Broadcasting locationUpdated for userId ${payload.userId}:`, locationData);
      // 2. Broadcast to admins WITH full details (Name & Photo)
      this.server.emit('locationUpdated', locationData);
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  @SubscribeMessage('joinAdminRoom')
  handleJoinAdmin(client: Socket) {
    console.log(`[Socket] Admin joined room: ${client.id}`);
    client.join('admin-room');
    
    // Sync all currently active officers immediately
    const activeList = Array.from(this.activeLocations.values());
    client.emit('activeLocationsSync', activeList);
  }

  @SubscribeMessage('emergencySignal')
  async handleEmergencySignal(client: Socket, payload: any) {
    const dateObj = new Date(payload.timestamp || Date.now());
    const gmt7Date = new Date(dateObj.getTime() + (7 * 60 * 60 * 1000));
    const dateSos = gmt7Date.toISOString().split('T')[0];
    const timeSos = gmt7Date.toISOString().split('T')[1].split('.')[0];
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${payload.lat},${payload.lng}`;

    // Note: Database insert is now handled via Next.js POST /api/sos API
    // before emitting this socket event, ensuring guaranteed persistence.
    // 2. Broadcast SOS signal to all connected admins immediately (GUARANTEED)
    try {
      this.server.emit('emergencySignal', {
        userId: payload.userId,
        fullName: payload.fullName,
        photoUrl: payload.photoUrl,
        phone: payload.phone,
        lat: payload.lat,
        lng: payload.lng,
        address: payload.address,
        dateSos,
        timeSos,
        mapLink,
        status: 'DARURAT',
        timestamp: payload.timestamp || Date.now(),
      });
    } catch (err) {
      console.error('Failed to broadcast emergency signal:', err);
    }
  }

  @SubscribeMessage('forceLogoutUser')
  handleForceLogoutUser(client: Socket, payload: { userId: number }) {
    // Find the socket id for this user and disconnect them
    let targetSocketId: string | null = null;
    for (const [socketId, userId] of this.socketToUserId.entries()) {
      if (userId === payload.userId) {
        targetSocketId = socketId;
        break;
      }
    }
    
    if (targetSocketId) {
      // Get the actual socket instance and send a specific logout event before disconnecting
      const targetSocket = this.server.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('forceLogout');
        targetSocket.disconnect();
      }
      this.activeLocations.delete(payload.userId);
      this.socketToUserId.delete(targetSocketId);
      this.server.emit('userOffline', { userId: payload.userId });
    }
  }

  // Data change events for realtime updates
  emitDataChange(entity: string, action: 'create' | 'update' | 'delete', data: any) {
    console.log(`[Socket] Emitting dataChange: ${entity} ${action}`, data?.id || '');
    this.server.emit('dataChange', { entity, action, data, timestamp: Date.now() });
  }

  emitTaskChange(action: 'create' | 'update' | 'delete', taskData: any) {
    this.emitDataChange('task', action, taskData);
  }

  emitReportChange(action: 'create' | 'update' | 'delete', reportData: any) {
    this.emitDataChange('report', action, reportData);
  }

  emitUserChange(action: 'create' | 'update' | 'delete', userData: any) {
    this.emitDataChange('user', action, userData);
  }

  emitAttendanceChange(action: 'create' | 'update', attendanceData: any) {
    this.emitDataChange('attendance', action, attendanceData);
  }
}

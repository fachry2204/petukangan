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

  constructor(private trackingService: TrackingService) {}

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('updateLocation')
  async handleLocationUpdate(client: Socket, payload: any) {
    try {
      // 1. Safe Native Database Save (Silently fail if history table is missing)
      try {
        const conn = await mysql.createConnection({
          host: process.env.DB_HOST || 'localhost',
          user: process.env.DB_USER || 'root',
          password: process.env.DB_PASSWORD || '',
          database: process.env.DB_NAME || 'ppsu_monitoring'
        });
        await conn.query(
          'INSERT INTO gps_tracking (user_id, lat, lng) VALUES (?, ?, ?)',
          [payload.userId, payload.lat, payload.lng]
        );
        await conn.end();
      } catch (dbErr) {
        // Ignore db save errors so live tracking still works
      }

      // 2. Broadcast to admins WITH full details (Name & Photo)
      this.server.emit('locationUpdated', {
        userId: payload.userId,
        fullName: payload.fullName,
        photoUrl: payload.photoUrl,
        lat: payload.lat,
        lng: payload.lng,
        timestamp: payload.timestamp || Date.now(),
      });
    } catch (error) {
      console.error('Error handling location update:', error);
    }
  }

  @SubscribeMessage('joinAdminRoom')
  handleJoinAdmin(client: Socket) {
    client.join('admin-room');
  }

  @SubscribeMessage('emergencySignal')
  async handleEmergencySignal(client: Socket, payload: any) {
    const dateObj = new Date(payload.timestamp || Date.now());
    const gmt7Date = new Date(dateObj.getTime() + (7 * 60 * 60 * 1000));
    const dateSos = gmt7Date.toISOString().split('T')[0];
    const timeSos = gmt7Date.toISOString().split('T')[1].split('.')[0];
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${payload.lat},${payload.lng}`;

    try {
      // 1. Save to Database natively
      const conn = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ppsu_monitoring'
      });
      
      await conn.query(
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
      await conn.end();
    } catch (dbErr) {
      console.error('Failed to save emergency signal to DB:', dbErr);
    }
      
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
}

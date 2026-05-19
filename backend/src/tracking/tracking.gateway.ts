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
    // Save to DB and broadcast to admins
    await this.trackingService.saveLocation(payload.userId, payload);
    this.server.emit('locationUpdated', {
      userId: payload.userId,
      lat: payload.lat,
      lng: payload.lng,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('joinAdminRoom')
  handleJoinAdmin(client: Socket) {
    client.join('admin-room');
  }

  @SubscribeMessage('emergencySignal')
  handleEmergencySignal(client: Socket, payload: any) {
    // Broadcast SOS signal to all connected admins immediately
    this.server.emit('emergencySignal', {
      userId: payload.userId,
      fullName: payload.fullName,
      photoUrl: payload.photoUrl,
      phone: payload.phone,
      lat: payload.lat,
      lng: payload.lng,
      timestamp: payload.timestamp || new Date().getTime(),
    });
  }
}

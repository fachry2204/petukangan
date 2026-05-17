import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TrackingService } from './tracking.service';
export declare class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private trackingService;
    server: Server;
    constructor(trackingService: TrackingService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleLocationUpdate(client: Socket, payload: any): Promise<void>;
    handleJoinAdmin(client: Socket): void;
}

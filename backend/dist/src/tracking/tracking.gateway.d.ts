import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TrackingService } from './tracking.service';
export declare class TrackingGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private trackingService;
    server: Server;
    private activeLocations;
    private socketToUserId;
    constructor(trackingService: TrackingService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): void;
    handleLocationUpdate(client: Socket, payload: any): Promise<void>;
    handleJoinAdmin(client: Socket): void;
    handleEmergencySignal(client: Socket, payload: any): Promise<void>;
    handleForceLogoutUser(client: Socket, payload: {
        userId: number;
    }): void;
    emitDataChange(entity: string, action: 'create' | 'update' | 'delete', data: any): void;
    emitTaskChange(action: 'create' | 'update' | 'delete', taskData: any): void;
    emitReportChange(action: 'create' | 'update' | 'delete', reportData: any): void;
    emitUserChange(action: 'create' | 'update' | 'delete', userData: any): void;
    emitAttendanceChange(action: 'create' | 'update', attendanceData: any): void;
}

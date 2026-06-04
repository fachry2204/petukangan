"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const tracking_service_1 = require("./tracking.service");
const mysql = __importStar(require("mysql2/promise"));
let TrackingGateway = class TrackingGateway {
    trackingService;
    server;
    activeLocations = new Map();
    socketToUserId = new Map();
    constructor(trackingService) {
        this.trackingService = trackingService;
    }
    async handleConnection(client) {
        console.log(`[Socket] Client connected: ${client.id}`);
        const auth = client.handshake.auth || {};
        const userInfo = {
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
            this.activeLocations.set(userInfo.userId, userInfo);
            this.socketToUserId.set(client.id, userInfo.userId);
            this.server.emit('userOnline', userInfo);
        }
        else {
            this.socketToUserId.set(client.id, null);
        }
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
        const userId = this.socketToUserId.get(client.id);
        if (userId) {
            this.activeLocations.delete(userId);
            this.socketToUserId.delete(client.id);
            this.server.emit('userOffline', { userId });
        }
    }
    async handleLocationUpdate(client, payload) {
        console.log(`[Socket] Received updateLocation from user:`, payload?.userId, 'coords:', payload?.lat, payload?.lng, 'gpsStatus:', payload?.gpsStatus);
        try {
            if (payload.lat != null && payload.lng != null) {
                try {
                    const conn = await mysql.createConnection({
                        host: process.env.DB_HOST || 'localhost',
                        user: process.env.DB_USER || 'root',
                        password: process.env.DB_PASSWORD || '',
                        database: process.env.DB_NAME || 'ppsu_monitoring'
                    });
                    await conn.query('INSERT INTO gps_tracking (userId, lat, lng) VALUES (?, ?, ?)', [payload.userId, payload.lat, payload.lng]);
                    await conn.end();
                }
                catch (dbErr) {
                }
            }
            const prev = this.activeLocations.get(payload.userId) || {};
            const hasNewCoords = payload.lat != null && payload.lng != null;
            const finalLat = hasNewCoords ? payload.lat : prev.lat ?? null;
            const finalLng = hasNewCoords ? payload.lng : prev.lng ?? null;
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
            this.server.emit('locationUpdated', locationData);
        }
        catch (error) {
            console.error('Error handling location update:', error);
        }
    }
    handleJoinAdmin(client) {
        console.log(`[Socket] Admin joined room: ${client.id}`);
        client.join('admin-room');
        const activeList = Array.from(this.activeLocations.values());
        client.emit('activeLocationsSync', activeList);
    }
    async handleEmergencySignal(client, payload) {
        const dateObj = new Date(payload.timestamp || Date.now());
        const gmt7Date = new Date(dateObj.getTime() + (7 * 60 * 60 * 1000));
        const dateSos = gmt7Date.toISOString().split('T')[0];
        const timeSos = gmt7Date.toISOString().split('T')[1].split('.')[0];
        const mapLink = `https://www.google.com/maps/search/?api=1&query=${payload.lat},${payload.lng}`;
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
        }
        catch (err) {
            console.error('Failed to broadcast emergency signal:', err);
        }
    }
    handleForceLogoutUser(client, payload) {
        let targetSocketId = null;
        for (const [socketId, userId] of this.socketToUserId.entries()) {
            if (userId === payload.userId) {
                targetSocketId = socketId;
                break;
            }
        }
        if (targetSocketId) {
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
    emitDataChange(entity, action, data) {
        console.log(`[Socket] Emitting dataChange: ${entity} ${action}`, data?.id || '');
        this.server.emit('dataChange', { entity, action, data, timestamp: Date.now() });
    }
    emitTaskChange(action, taskData) {
        this.emitDataChange('task', action, taskData);
    }
    emitReportChange(action, reportData) {
        this.emitDataChange('report', action, reportData);
    }
    emitUserChange(action, userData) {
        this.emitDataChange('user', action, userData);
    }
    emitAttendanceChange(action, attendanceData) {
        this.emitDataChange('attendance', action, attendanceData);
    }
};
exports.TrackingGateway = TrackingGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], TrackingGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('updateLocation'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], TrackingGateway.prototype, "handleLocationUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('joinAdminRoom'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], TrackingGateway.prototype, "handleJoinAdmin", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('emergencySignal'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], TrackingGateway.prototype, "handleEmergencySignal", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('forceLogoutUser'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], TrackingGateway.prototype, "handleForceLogoutUser", null);
exports.TrackingGateway = TrackingGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [tracking_service_1.TrackingService])
], TrackingGateway);
//# sourceMappingURL=tracking.gateway.js.map
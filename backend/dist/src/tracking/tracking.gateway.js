"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const tracking_service_1 = require("./tracking.service");
let TrackingGateway = class TrackingGateway {
    trackingService;
    server;
    constructor(trackingService) {
        this.trackingService = trackingService;
    }
    async handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
    }
    handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
    }
    async handleLocationUpdate(client, payload) {
        await this.trackingService.saveLocation(payload.userId, payload);
        this.server.emit('locationUpdated', {
            userId: payload.userId,
            lat: payload.lat,
            lng: payload.lng,
            timestamp: new Date(),
        });
    }
    handleJoinAdmin(client) {
        client.join('admin-room');
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
exports.TrackingGateway = TrackingGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
    }),
    __metadata("design:paramtypes", [tracking_service_1.TrackingService])
], TrackingGateway);
//# sourceMappingURL=tracking.gateway.js.map
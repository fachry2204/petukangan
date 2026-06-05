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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrackingController = void 0;
const common_1 = require("@nestjs/common");
const tracking_service_1 = require("./tracking.service");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let TrackingController = class TrackingController {
    trackingService;
    constructor(trackingService) {
        this.trackingService = trackingService;
    }
    async getHistory(minutes) {
        const m = Math.max(1, Math.min(Number(minutes) || tracking_service_1.GPS_RETENTION_MINUTES, 60));
        const purged = await this.trackingService.purgeOldHistory(m);
        const points = await this.trackingService.getHistoryWithin(m);
        return { minutes: m, purged, count: points.length, points };
    }
    async getGPSHistory(startDate, endDate, userId) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const points = await this.trackingService.getGPSHistory(start, end, userId ? Number(userId) : undefined);
        return {
            startDate,
            endDate,
            count: points.length,
            points
        };
    }
    async getActiveUsers(startDate, endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const users = await this.trackingService.getActiveUsersInRange(start, end);
        return { users };
    }
    async purgeOld(minutes) {
        const m = Math.max(1, Math.min(Number(minutes) || tracking_service_1.GPS_RETENTION_MINUTES, 1440));
        const purged = await this.trackingService.purgeOldHistory(m);
        return { minutes: m, purged };
    }
};
exports.TrackingController = TrackingController;
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Query)('minutes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TrackingController.prototype, "getHistory", null);
__decorate([
    (0, common_1.Get)('gps-history'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __param(2, (0, common_1.Query)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], TrackingController.prototype, "getGPSHistory", null);
__decorate([
    (0, common_1.Get)('gps-users'),
    __param(0, (0, common_1.Query)('startDate')),
    __param(1, (0, common_1.Query)('endDate')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TrackingController.prototype, "getActiveUsers", null);
__decorate([
    (0, common_1.Delete)('history/old'),
    __param(0, (0, common_1.Query)('minutes')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TrackingController.prototype, "purgeOld", null);
exports.TrackingController = TrackingController = __decorate([
    (0, common_1.Controller)('tracking'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [tracking_service_1.TrackingService])
], TrackingController);
//# sourceMappingURL=tracking.controller.js.map
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
exports.TrackingService = exports.GPS_RETENTION_MINUTES = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const gps_tracking_entity_1 = require("./gps-tracking.entity");
exports.GPS_RETENTION_MINUTES = 5;
let TrackingService = class TrackingService {
    gpsRepository;
    constructor(gpsRepository) {
        this.gpsRepository = gpsRepository;
    }
    async saveLocation(userId, data) {
        const tracking = this.gpsRepository.create({
            user: { id: userId },
            lat: data.lat,
            lng: data.lng,
            speed: data.speed,
            batteryLevel: data.batteryLevel,
            isMock: data.isMock,
        });
        return this.gpsRepository.save(tracking);
    }
    async getLatestLocations() {
        return [];
    }
    async purgeOldHistory(minutes = exports.GPS_RETENTION_MINUTES) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        const result = await this.gpsRepository.delete({ timestamp: (0, typeorm_2.LessThan)(cutoff) });
        return result.affected ?? 0;
    }
    async getHistoryWithin(minutes = exports.GPS_RETENTION_MINUTES) {
        const cutoff = new Date(Date.now() - minutes * 60 * 1000);
        const rows = await this.gpsRepository
            .createQueryBuilder('g')
            .leftJoin('users', 'u', 'u.id = g.userId')
            .select([
            'g.id AS id',
            'g.userId AS userId',
            'g.lat AS lat',
            'g.lng AS lng',
            'g.timestamp AS timestamp',
            'u.fullName AS fullName',
            'u.photoUrl AS photoUrl',
        ])
            .where('g.timestamp >= :cutoff', { cutoff })
            .orderBy('g.timestamp', 'ASC')
            .getRawMany();
        return rows.map((r) => ({
            id: Number(r.id),
            userId: Number(r.userId),
            lat: Number(r.lat),
            lng: Number(r.lng),
            timestamp: r.timestamp,
            fullName: r.fullName,
            photoUrl: r.photoUrl,
        }));
    }
    async getGPSHistory(startDate, endDate, userId) {
        const query = this.gpsRepository
            .createQueryBuilder('g')
            .leftJoinAndSelect('g.user', 'u')
            .where('g.timestamp >= :startDate AND g.timestamp <= :endDate', {
            startDate,
            endDate
        });
        if (userId) {
            query.andWhere('g.userId = :userId', { userId });
        }
        const rows = await query
            .orderBy('g.timestamp', 'ASC')
            .getMany();
        return rows.map((r) => ({
            id: Number(r.id),
            userId: r.user?.id,
            lat: Number(r.lat),
            lng: Number(r.lng),
            timestamp: r.timestamp,
            fullName: r.user?.fullName,
            photoUrl: r.user?.photoUrl,
            speed: r.speed,
            batteryLevel: r.batteryLevel,
            isMock: r.isMock,
        }));
    }
    async getActiveUsersInRange(startDate, endDate) {
        const rows = await this.gpsRepository
            .createQueryBuilder('g')
            .select('g.userId', 'userId')
            .addSelect('MIN(u.fullName)', 'fullName')
            .leftJoin('users', 'u', 'u.id = g.userId')
            .where('g.timestamp >= :startDate AND g.timestamp <= :endDate', {
            startDate,
            endDate
        })
            .groupBy('g.userId')
            .getRawMany();
        return rows.map((r) => ({
            userId: Number(r.userId),
            fullName: r.fullName || `Petugas ${r.userId}`,
        }));
    }
};
exports.TrackingService = TrackingService;
exports.TrackingService = TrackingService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(gps_tracking_entity_1.GPSTracking)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], TrackingService);
//# sourceMappingURL=tracking.service.js.map
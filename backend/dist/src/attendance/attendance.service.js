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
exports.AttendanceService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const attendance_entity_1 = require("./attendance.entity");
const schedule_entity_1 = require("../schedules/schedule.entity");
const attendance_request_entity_1 = require("./attendance-request.entity");
const lembur_entity_1 = require("./lembur.entity");
const anti_manipulation_service_1 = require("../common/anti-manipulation.service");
const geofence_service_1 = require("../common/geofence.service");
const file_service_1 = require("../common/file.service");
let AttendanceService = class AttendanceService {
    attendanceRepository;
    scheduleRepository;
    requestRepository;
    lemburRepository;
    antiManipulation;
    geofence;
    fileService;
    constructor(attendanceRepository, scheduleRepository, requestRepository, lemburRepository, antiManipulation, geofence, fileService) {
        this.attendanceRepository = attendanceRepository;
        this.scheduleRepository = scheduleRepository;
        this.requestRepository = requestRepository;
        this.lemburRepository = lemburRepository;
        this.antiManipulation = antiManipulation;
        this.geofence = geofence;
        this.fileService = fileService;
    }
    async submit(userId, type, data) {
        const isPermitType = ['PERMIT', 'EARLY_OUT'].includes(type);
        if (!isPermitType) {
            if (!this.antiManipulation.validateGPS(data.lat, data.lng, data.isMock)) {
                throw new common_1.BadRequestException('Lokasi GPS tidak valid atau manipulasi terdeteksi');
            }
            if (!this.antiManipulation.validateTimestamp(data.clientTimestamp)) {
                throw new common_1.BadRequestException('Waktu device tidak sinkron dengan server');
            }
        }
        let finalPhotoUrl = data.photoUrl;
        if (data.photoUrl && data.photoUrl.startsWith('data:image')) {
            finalPhotoUrl = await this.fileService.saveBase64Image('absensi', userId, data.photoUrl);
        }
        let isOutsideSchedule = false;
        if (type === 'IN') {
            try {
                const todayStr = new Date().toISOString().split('T')[0];
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const todayRecords = await this.attendanceRepository.createQueryBuilder('attendance')
                    .where('attendance.userId = :userId', { userId })
                    .andWhere('attendance.timestamp >= :today', { today })
                    .getMany();
                const todayLembur = await this.lemburRepository.createQueryBuilder('lembur')
                    .where('lembur.userId = :userId', { userId })
                    .andWhere('lembur.timestamp >= :today', { today })
                    .getMany();
                const hasOut = todayRecords.some(r => r.type === 'OUT') || todayLembur.some(r => r.type === 'OUT');
                if (hasOut) {
                    isOutsideSchedule = true;
                }
                else {
                    const schedules = await this.scheduleRepository.find();
                    const hasSchedule = schedules.some(s => {
                        const sDateStr = s.date ? new Date(s.date).toISOString().split('T')[0] : '';
                        if (sDateStr !== todayStr)
                            return false;
                        const users = Array.isArray(s.assignedUsers) ? s.assignedUsers : [];
                        return users.some((u) => u.id === userId);
                    });
                    if (!hasSchedule) {
                        isOutsideSchedule = true;
                    }
                }
            }
            catch (err) {
                console.error('Failed to check today schedule for outside assignment:', err);
            }
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const approvedRequest = await this.requestRepository.createQueryBuilder('request')
            .where('request.userId = :userId', { userId })
            .andWhere('request.timestamp >= :today', { today })
            .andWhere('request.status = :status', { status: 'APPROVED' })
            .getOne();
        if (type === 'IN' && isOutsideSchedule) {
            if (!approvedRequest) {
                const request = this.requestRepository.create({
                    user: { id: userId },
                    lat: data.lat || 0,
                    lng: data.lng || 0,
                    address: data.address || 'Permintaan Absen Masuk (Luar Jadwal)',
                    reason: data.reason || null,
                    status: 'PENDING',
                });
                return this.requestRepository.save(request);
            }
        }
        const isPendingStatus = isPermitType;
        if (approvedRequest) {
            const lembur = this.lemburRepository.create({
                user: { id: userId },
                type,
                lat: data.lat || 0,
                lng: data.lng || 0,
                address: data.address || (type === 'PERMIT' ? 'Pengajuan Izin Tidak Masuk' : 'Pengajuan Pulang Awal'),
                photoUrl: finalPhotoUrl,
                deviceInfo: data.deviceInfo,
                isMock: data.isMock || false,
                status: isPendingStatus ? 'PENDING' : 'VALID',
                isOutsideSchedule: true,
                reason: data.reason || null,
            });
            return this.lemburRepository.save(lembur);
        }
        const attendance = this.attendanceRepository.create({
            user: { id: userId },
            type,
            lat: data.lat || 0,
            lng: data.lng || 0,
            address: data.address || (type === 'PERMIT' ? 'Pengajuan Izin Tidak Masuk' : 'Pengajuan Pulang Awal'),
            photoUrl: finalPhotoUrl,
            deviceInfo: data.deviceInfo,
            isMock: data.isMock || false,
            status: isPendingStatus ? 'PENDING' : 'VALID',
            isOutsideSchedule,
            reason: data.reason || null,
        });
        return this.attendanceRepository.save(attendance);
    }
    async getTodayAttendance(userId) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const requests = await this.requestRepository.createQueryBuilder('request')
            .where('request.userId = :userId', { userId })
            .andWhere('request.timestamp >= :today', { today })
            .orderBy('request.id', 'DESC')
            .getMany();
        const latestRequest = requests[0];
        const hasApprovedRequest = latestRequest && latestRequest.status === 'APPROVED';
        let records = [];
        if (hasApprovedRequest) {
            records = await this.lemburRepository.createQueryBuilder('lembur')
                .where('lembur.userId = :userId', { userId })
                .andWhere('lembur.timestamp >= :today', { today })
                .orderBy('lembur.id', 'ASC')
                .getMany();
        }
        else {
            records = await this.attendanceRepository.createQueryBuilder('attendance')
                .where('attendance.userId = :userId', { userId })
                .andWhere('attendance.timestamp >= :today', { today })
                .orderBy('attendance.id', 'ASC')
                .getMany();
        }
        const hasPendingRequest = latestRequest && latestRequest.status === 'PENDING';
        const rejectedRequest = latestRequest && latestRequest.status === 'REJECTED' ? latestRequest : null;
        const hasIn = records.some(r => r.type === 'IN' && r.status !== 'PENDING');
        const hasBreak = records.some(r => r.type === 'BREAK');
        const hasEndBreak = records.some(r => r.type === 'END_BREAK');
        const hasOut = records.some(r => r.type === 'OUT');
        const hasPermit = records.some(r => r.type === 'PERMIT');
        const hasEarlyOut = records.some(r => r.type === 'EARLY_OUT');
        let result = { status: 'Belum Absen', records };
        if (hasPendingRequest) {
            result = { status: 'Menunggu Diterima', records };
        }
        else if (hasPermit) {
            const pRecord = records.find(r => r.type === 'PERMIT');
            if (pRecord && pRecord.status === 'REJECTED') {
                result = { status: 'Belum Absen', records };
            }
            else {
                result = { status: 'Izin Tidak Masuk', records };
            }
        }
        else if (hasEarlyOut) {
            const eoRecord = records.find(r => r.type === 'EARLY_OUT');
            if (eoRecord && eoRecord.status === 'REJECTED') {
                if (hasEndBreak)
                    result = { status: 'Selesai Istirahat', records };
                else if (hasBreak)
                    result = { status: 'Absen Istirahat', records };
                else
                    result = { status: 'Sudah Absen', records };
            }
            else {
                result = { status: 'Pulang Awal', records };
            }
        }
        else if (hasOut) {
            result = { status: 'Sudah Absen Pulang', records };
        }
        else if (hasEndBreak) {
            result = { status: 'Selesai Istirahat', records };
        }
        else if (hasBreak) {
            result = { status: 'Absen Istirahat', records };
        }
        else if (hasIn) {
            result = { status: 'Sudah Absen', records };
        }
        else {
            result = { status: 'Belum Absen', records };
        }
        result.hasApprovedRequest = !!hasApprovedRequest;
        result.rejectedRequest = rejectedRequest;
        return result;
    }
    async getAllAttendance(userId) {
        const regular = await this.attendanceRepository.find({
            where: { user: { id: userId } },
            relations: ['user'],
            order: { id: 'DESC' }
        });
        const lembur = await this.lemburRepository.find({
            where: { user: { id: userId } },
            relations: ['user'],
            order: { id: 'DESC' }
        });
        const regularMapped = regular.map(r => ({ ...r, isLembur: false }));
        const lemburMapped = lembur.map(l => ({ ...l, isLembur: true }));
        return [...regularMapped, ...lemburMapped].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }
    async getAdminAllAttendance() {
        const records = await this.attendanceRepository.find({
            relations: ['user'],
            order: { timestamp: 'DESC', id: 'DESC' }
        });
        const lembur = await this.lemburRepository.find({
            relations: ['user'],
            order: { timestamp: 'DESC', id: 'DESC' }
        });
        const requests = await this.requestRepository.find({
            relations: ['user'],
            order: { timestamp: 'DESC', id: 'DESC' }
        });
        const mappedRequests = requests.map(req => ({
            id: req.id,
            user: req.user,
            type: 'IN',
            timestamp: req.timestamp,
            lat: req.lat,
            lng: req.lng,
            address: req.address,
            photoUrl: null,
            reason: req.reason,
            deviceInfo: null,
            isMock: false,
            status: req.status,
            isOutsideSchedule: true,
            rejectionReason: req.rejectionReason,
            isRequestTable: true,
        }));
        const recordsMapped = records.map(r => ({ ...r, isLembur: false }));
        const lemburMapped = lembur.map(l => ({ ...l, isLembur: true }));
        const merged = [...recordsMapped, ...lemburMapped, ...mappedRequests];
        merged.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        return merged;
    }
    async updateStatus(id, status, rejectionReason, isRequestTable) {
        if (isRequestTable) {
            const request = await this.requestRepository.findOne({
                where: { id }
            });
            if (!request) {
                throw new common_1.BadRequestException('Permintaan absen tidak ditemukan');
            }
            request.status = status;
            if (rejectionReason !== undefined) {
                request.rejectionReason = rejectionReason;
            }
            return this.requestRepository.save(request);
        }
        let record = await this.attendanceRepository.findOne({
            where: { id }
        });
        let isLembur = false;
        if (!record) {
            record = await this.lemburRepository.findOne({
                where: { id }
            });
            isLembur = true;
        }
        if (!record) {
            throw new common_1.BadRequestException('Data absensi tidak ditemukan');
        }
        record.status = status;
        if (rejectionReason !== undefined) {
            record.rejectionReason = rejectionReason;
        }
        if (isLembur) {
            return this.lemburRepository.save(record);
        }
        return this.attendanceRepository.save(record);
    }
};
exports.AttendanceService = AttendanceService;
exports.AttendanceService = AttendanceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(attendance_entity_1.Attendance)),
    __param(1, (0, typeorm_1.InjectRepository)(schedule_entity_1.Schedule)),
    __param(2, (0, typeorm_1.InjectRepository)(attendance_request_entity_1.AttendanceRequest)),
    __param(3, (0, typeorm_1.InjectRepository)(lembur_entity_1.Lembur)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        anti_manipulation_service_1.AntiManipulationService,
        geofence_service_1.GeofenceService,
        file_service_1.FileService])
], AttendanceService);
//# sourceMappingURL=attendance.service.js.map
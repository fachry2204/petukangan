import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Attendance } from './attendance.entity';
import { Schedule } from '../schedules/schedule.entity';
import { AttendanceRequest } from './attendance-request.entity';
import { Lembur } from './lembur.entity';
import { AntiManipulationService } from '../common/anti-manipulation.service';
import { GeofenceService } from '../common/geofence.service';
import { FileService } from '../common/file.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectRepository(Attendance)
    private attendanceRepository: Repository<Attendance>,
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(AttendanceRequest)
    private requestRepository: Repository<AttendanceRequest>,
    @InjectRepository(Lembur)
    private lemburRepository: Repository<Lembur>,
    private antiManipulation: AntiManipulationService,
    private geofence: GeofenceService,
    private fileService: FileService,
    @Inject(forwardRef(() => TrackingGateway))
    private trackingGateway: TrackingGateway,
  ) {}

  async submit(userId: number, type: string, data: any) {
    const isPermitType = ['PERMIT', 'EARLY_OUT'].includes(type);

    if (!isPermitType) {
      // 1. Anti-Mock Check
      if (!this.antiManipulation.validateGPS(data.lat, data.lng, data.isMock)) {
        throw new BadRequestException('Lokasi GPS tidak valid atau manipulasi terdeteksi');
      }

      // 2. Timestamp Validation
      if (!this.antiManipulation.validateTimestamp(data.clientTimestamp)) {
        throw new BadRequestException('Waktu device tidak sinkron dengan server');
      }
    }

    // 3. Save Photo if base64
    let finalPhotoUrl = data.photoUrl;
    if (data.photoUrl && data.photoUrl.startsWith('data:image')) {
      finalPhotoUrl = await this.fileService.saveBase64Image('absensi', userId, data.photoUrl);
    }

    // 4. Check if outside of schedule or already checked out today
    let isOutsideSchedule = false;
    if (type === 'IN') {
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        
        // Check if already checked out today
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
        } else {
          // Check schedule
          const schedules = await this.scheduleRepository.find();
          const hasSchedule = schedules.some(s => {
            const sDateStr = s.date ? new Date(s.date).toISOString().split('T')[0] : '';
            if (sDateStr !== todayStr) return false;
            const users = Array.isArray(s.assignedUsers) ? s.assignedUsers : [];
            return users.some((u: any) => u.id === userId);
          });
          if (!hasSchedule) {
            isOutsideSchedule = true;
          }
        }
      } catch (err) {
        console.error('Failed to check today schedule for outside assignment:', err);
      }
    }

    // Check if there is an APPROVED request today in attendance_requests
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const approvedRequest = await this.requestRepository.createQueryBuilder('request')
      .where('request.userId = :userId', { userId })
      .andWhere('request.timestamp >= :today', { today })
      .andWhere('request.status = :status', { status: 'APPROVED' })
      .getOne();

    if (type === 'IN' && isOutsideSchedule) {
      if (!approvedRequest) {
        // Save to attendance_requests instead of attendance!
        const request = this.requestRepository.create({
          user: { id: userId } as any,
          lat: data.lat || 0,
          lng: data.lng || 0,
          address: data.address || 'Permintaan Absen Masuk (Luar Jadwal)',
          reason: data.reason || null,
          status: 'PENDING',
        });
        const savedRequest = await this.requestRepository.save(request);
        this.trackingGateway.emitAttendanceChange('create', { ...savedRequest, isRequestTable: true });
        return savedRequest;
      }
    }

    const isPendingStatus = isPermitType;

    // IF there is an approved request today, then save to lembur table!
    if (approvedRequest) {
      const lembur = this.lemburRepository.create({
        user: { id: userId } as any,
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
      const savedLembur = await this.lemburRepository.save(lembur);
      this.trackingGateway.emitAttendanceChange('create', savedLembur);
      return savedLembur;
    }

    // Otherwise, save to regular attendance table
    const attendance = this.attendanceRepository.create({
      user: { id: userId } as any,
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

    const savedAttendance = await this.attendanceRepository.save(attendance);
    this.trackingGateway.emitAttendanceChange('create', savedAttendance);
    return savedAttendance;
  }

  async getTodayAttendance(userId: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const requests = await this.requestRepository.createQueryBuilder('request')
      .where('request.userId = :userId', { userId })
      .andWhere('request.timestamp >= :today', { today })
      .orderBy('request.id', 'DESC')
      .getMany();

    const latestRequest = requests[0];
    const hasApprovedRequest = latestRequest && latestRequest.status === 'APPROVED';

    let records: any[] = [];
    if (hasApprovedRequest) {
      records = await this.lemburRepository.createQueryBuilder('lembur')
        .where('lembur.userId = :userId', { userId })
        .andWhere('lembur.timestamp >= :today', { today })
        .orderBy('lembur.id', 'ASC')
        .getMany();
    } else {
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

    let result: any = { status: 'Belum Absen', records };

    if (hasPendingRequest) {
      result = { status: 'Menunggu Diterima', records };
    } else if (hasPermit) {
      const pRecord = records.find(r => r.type === 'PERMIT');
      if (pRecord && pRecord.status === 'REJECTED') {
        result = { status: 'Belum Absen', records };
      } else {
        result = { status: 'Izin Tidak Masuk', records };
      }
    } else if (hasEarlyOut) {
      const eoRecord = records.find(r => r.type === 'EARLY_OUT');
      if (eoRecord && eoRecord.status === 'REJECTED') {
        if (hasEndBreak) result = { status: 'Selesai Istirahat', records };
        else if (hasBreak) result = { status: 'Absen Istirahat', records };
        else result = { status: 'Sudah Absen', records };
      } else {
        result = { status: 'Pulang Awal', records };
      }
    } else if (hasOut) {
      result = { status: 'Sudah Absen Pulang', records };
    } else if (hasEndBreak) {
      result = { status: 'Selesai Istirahat', records };
    } else if (hasBreak) {
      result = { status: 'Absen Istirahat', records };
    } else if (hasIn) {
      result = { status: 'Sudah Absen', records };
    } else {
      result = { status: 'Belum Absen', records };
    }

    result.hasApprovedRequest = !!hasApprovedRequest;
    result.rejectedRequest = rejectedRequest;
    return result;
  }

  async getAllAttendance(userId: number) {
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

  async updateStatus(id: number, status: string, rejectionReason?: string, isRequestTable?: boolean) {
    if (isRequestTable) {
      const request = await this.requestRepository.findOne({
        where: { id }
      });
      if (!request) {
        throw new BadRequestException('Permintaan absen tidak ditemukan');
      }
      request.status = status;
      if (rejectionReason !== undefined) {
        request.rejectionReason = rejectionReason;
      }
      const savedRequest = await this.requestRepository.save(request);
      // Emit realtime event
      this.trackingGateway.emitAttendanceChange('update', { ...savedRequest, isRequestTable: true });
      return savedRequest;
    }

    let record = await this.attendanceRepository.findOne({
      where: { id }
    });

    let isLembur = false;
    if (!record) {
      record = await this.lemburRepository.findOne({
        where: { id }
      }) as any;
      isLembur = true;
    }

    if (!record) {
      throw new BadRequestException('Data absensi tidak ditemukan');
    }

    record.status = status;
    if (rejectionReason !== undefined) {
      record.rejectionReason = rejectionReason;
    }

    if (isLembur) {
      const savedRecord = await this.lemburRepository.save(record as any);
      this.trackingGateway.emitAttendanceChange('update', savedRecord);
      return savedRecord;
    }
    const savedRecord = await this.attendanceRepository.save(record);
    this.trackingGateway.emitAttendanceChange('update', savedRecord);
    return savedRecord;
  }
}

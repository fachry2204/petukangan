import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository, Between, MoreThanOrEqual } from 'typeorm';
import { GPSTracking } from './gps-tracking.entity';

// Retain only the most recent N minutes of GPS history for live tracking.
export const GPS_RETENTION_MINUTES = 5;

@Injectable()
export class TrackingService {
  constructor(
    @InjectRepository(GPSTracking)
    private gpsRepository: Repository<GPSTracking>,
  ) {}

  async saveLocation(userId: number, data: any) {
    const tracking = this.gpsRepository.create({
      user: { id: userId } as any,
      lat: data.lat,
      lng: data.lng,
      speed: data.speed,
      batteryLevel: data.batteryLevel,
      isMock: data.isMock,
      ipAddress: data.ipAddress,
      wifiName: data.wifiName,
      provider: data.provider,
      statusAbsen: data.statusAbsen,
    });
    return this.gpsRepository.save(tracking);
  }

  async getLatestLocations() {
    // Logic to get latest location for each active user
    return [];
  }

  // Delete GPS rows older than the retention window.
  async purgeOldHistory(minutes = GPS_RETENTION_MINUTES): Promise<number> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    const result = await this.gpsRepository.delete({ timestamp: LessThan(cutoff) });
    return result.affected ?? 0;
  }

  // Return GPS points within the retention window, joined with user info.
  async getHistoryWithin(minutes = GPS_RETENTION_MINUTES): Promise<any[]> {
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

  // Get GPS history by date range and optional user filter
  async getGPSHistory(startDate: Date, endDate: Date, userId?: number): Promise<any[]> {
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
      ipAddress: r.ipAddress,
      wifiName: r.wifiName,
      provider: r.provider,
      statusAbsen: r.statusAbsen,
    }));
  }

  // Get distinct users who have GPS data in a date range
  async getActiveUsersInRange(startDate: Date, endDate: Date): Promise<any[]> {
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
}

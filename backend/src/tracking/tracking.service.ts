import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { GPSTracking } from './gps-tracking.entity';

// Retain only the most recent N minutes of GPS history.
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
}

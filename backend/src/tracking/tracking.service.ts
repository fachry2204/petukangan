import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GPSTracking } from './gps-tracking.entity';

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
}

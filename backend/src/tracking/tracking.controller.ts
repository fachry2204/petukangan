import { Controller, Delete, Get, Query, UseGuards } from '@nestjs/common';
import { GPS_RETENTION_MINUTES, TrackingService } from './tracking.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tracking')
@UseGuards(JwtAuthGuard)
export class TrackingController {
  constructor(private readonly trackingService: TrackingService) {}

  // Returns GPS points within the retention window. Also purges older rows
  // so the table only ever keeps the last N minutes of data.
  @Get('history')
  async getHistory(@Query('minutes') minutes?: string) {
    const m = Math.max(1, Math.min(Number(minutes) || GPS_RETENTION_MINUTES, 60));
    const purged = await this.trackingService.purgeOldHistory(m);
    const points = await this.trackingService.getHistoryWithin(m);
    return { minutes: m, purged, count: points.length, points };
  }

  // Get GPS history by date range with optional user filter
  @Get('gps-history')
  async getGPSHistory(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const points = await this.trackingService.getGPSHistory(
      start, 
      end, 
      userId ? Number(userId) : undefined
    );
    
    return { 
      startDate, 
      endDate, 
      count: points.length, 
      points 
    };
  }

  // Get distinct users who have GPS data in a date range
  @Get('gps-users')
  async getActiveUsers(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    
    const users = await this.trackingService.getActiveUsersInRange(start, end);
    return { users };
  }

  // Get latest locations for all active officers (fallback when socket is unavailable)
  @Get('active-officers')
  async getActiveOfficers(@Query('minutes') minutes?: string) {
    const m = Math.max(1, Math.min(Number(minutes) || 60, 240));
    const officers = await this.trackingService.getLatestLocations(m);
    return { count: officers.length, officers };
  }

  // Manual cleanup endpoint (idempotent).
  @Delete('history/old')
  async purgeOld(@Query('minutes') minutes?: string) {
    const m = Math.max(1, Math.min(Number(minutes) || GPS_RETENTION_MINUTES, 1440));
    const purged = await this.trackingService.purgeOldHistory(m);
    return { minutes: m, purged };
  }
}

import { Controller, Delete, Get, Query } from '@nestjs/common';
import { GPS_RETENTION_MINUTES, TrackingService } from './tracking.service';

@Controller('tracking')
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

  // Manual cleanup endpoint (idempotent).
  @Delete('history/old')
  async purgeOld(@Query('minutes') minutes?: string) {
    const m = Math.max(1, Math.min(Number(minutes) || GPS_RETENTION_MINUTES, 1440));
    const purged = await this.trackingService.purgeOldHistory(m);
    return { minutes: m, purged };
  }
}

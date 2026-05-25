import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService, GPS_RETENTION_MINUTES } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { GPSTracking } from './gps-tracking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GPSTracking])],
  controllers: [TrackingController],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingService, TrackingGateway],
})
export class TrackingModule implements OnModuleInit {
  constructor(private readonly trackingService: TrackingService) {}

  onModuleInit() {
    // Periodically purge GPS rows older than the retention window so the
    // history table never grows unbounded.
    setInterval(() => {
      this.trackingService
        .purgeOldHistory(GPS_RETENTION_MINUTES)
        .catch((err) =>
          console.error('[Tracking] purgeOldHistory failed:', err?.message || err),
        );
    }, 60 * 1000); // every 60 seconds
  }
}

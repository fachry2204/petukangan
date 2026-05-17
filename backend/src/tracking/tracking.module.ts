import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrackingGateway } from './tracking.gateway';
import { TrackingService } from './tracking.service';
import { GPSTracking } from './gps-tracking.entity';

@Module({
  imports: [TypeOrmModule.forFeature([GPSTracking])],
  providers: [TrackingGateway, TrackingService],
  exports: [TrackingService],
})
export class TrackingModule {}

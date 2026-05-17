import { Module, Global } from '@nestjs/common';
import { AntiManipulationService } from './anti-manipulation.service';
import { GeofenceService } from './geofence.service';
import { FileService } from './file.service';

@Global()
@Module({
  providers: [AntiManipulationService, GeofenceService, FileService],
  exports: [AntiManipulationService, GeofenceService, FileService],
})
export class CommonModule {}


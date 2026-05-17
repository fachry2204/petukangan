import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';
import { Attendance } from './attendance.entity';
import { Schedule } from '../schedules/schedule.entity';
import { AttendanceRequest } from './attendance-request.entity';
import { Lembur } from './lembur.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Attendance, Schedule, AttendanceRequest, Lembur])],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from './report.entity';
import { ReportPhoto } from './report-photo.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Report, ReportPhoto])],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Report } from './report.entity';
import { ReportPhoto } from './report-photo.entity';
import { FileService } from '../common/file.service';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report)
    private reportRepository: Repository<Report>,
    @InjectRepository(ReportPhoto)
    private reportPhotoRepository: Repository<ReportPhoto>,
    private fileService: FileService,
  ) {}

  async create(userId: number, data: any) {
    const report = this.reportRepository.create({
      user: { id: userId } as any,
      category: data.type,
      title: data.title,
      description: data.description,
      lat: data.lat,
      lng: data.lng,
      address: data.address,
      priority: data.urgency,
      status: 'PENDING',
    });

    
    const savedReport = await this.reportRepository.save(report);

    // Save photos if provided
    if (data.photos && Array.isArray(data.photos)) {
      for (const base64Photo of data.photos) {
        const photoUrl = await this.fileService.saveBase64Image('laporan', userId, base64Photo);
        const reportPhoto = this.reportPhotoRepository.create({
          report: savedReport,
          photoUrl,
        });
        await this.reportPhotoRepository.save(reportPhoto);
      }
    }

    return savedReport;
  }

  async findAll() {
    return this.reportRepository.find({ relations: ['user', 'photos'] });
  }

  async findOne(id: number) {
    const report = await this.reportRepository.findOne({ 
      where: { id },
      relations: ['user', 'photos'] 
    });
    if (!report) throw new NotFoundException('Laporan tidak ditemukan');
    return report;
  }
}

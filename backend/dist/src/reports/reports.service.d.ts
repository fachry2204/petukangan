import { Repository } from 'typeorm';
import { Report } from './report.entity';
import { ReportPhoto } from './report-photo.entity';
import { FileService } from '../common/file.service';
export declare class ReportsService {
    private reportRepository;
    private reportPhotoRepository;
    private fileService;
    constructor(reportRepository: Repository<Report>, reportPhotoRepository: Repository<ReportPhoto>, fileService: FileService);
    create(userId: number, data: any): Promise<Report>;
    findAll(): Promise<Report[]>;
    findOne(id: number): Promise<Report>;
}

import { Repository } from 'typeorm';
import { Report } from './report.entity';
import { ReportPhoto } from './report-photo.entity';
import { FileService } from '../common/file.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
export declare class ReportsService {
    private reportRepository;
    private reportPhotoRepository;
    private fileService;
    private trackingGateway;
    constructor(reportRepository: Repository<Report>, reportPhotoRepository: Repository<ReportPhoto>, fileService: FileService, trackingGateway: TrackingGateway);
    create(userId: number, data: any): Promise<Report>;
    findAll(): Promise<Report[]>;
    findOne(id: number): Promise<Report>;
}

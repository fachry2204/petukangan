import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskLog } from './task-log.entity';
import { FileService } from '../common/file.service';
import { TrackingGateway } from '../tracking/tracking.gateway';
export declare class TasksService {
    private taskRepository;
    private taskLogRepository;
    private fileService;
    private trackingGateway;
    constructor(taskRepository: Repository<Task>, taskLogRepository: Repository<TaskLog>, fileService: FileService, trackingGateway: TrackingGateway);
    findAll(userId?: number): Promise<Task[]>;
    findOne(id: number): Promise<Task>;
    updateStatus(id: number, userId: number, data: any): Promise<Task>;
    update(id: number, data: any): Promise<Task>;
    remove(id: number): Promise<{
        id: number;
        deleted: boolean;
    }>;
    create(userId: number, data: any): Promise<Task>;
}

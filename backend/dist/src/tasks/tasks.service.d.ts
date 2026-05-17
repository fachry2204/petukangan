import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskLog } from './task-log.entity';
import { FileService } from '../common/file.service';
export declare class TasksService {
    private taskRepository;
    private taskLogRepository;
    private fileService;
    constructor(taskRepository: Repository<Task>, taskLogRepository: Repository<TaskLog>, fileService: FileService);
    findAll(userId?: number): Promise<Task[]>;
    findOne(id: number): Promise<Task>;
    updateStatus(id: number, userId: number, data: any): Promise<Task>;
    create(userId: number, data: any): Promise<Task>;
}

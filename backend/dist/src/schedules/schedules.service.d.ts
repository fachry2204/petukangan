import { Repository } from 'typeorm';
import { Schedule } from './schedule.entity';
export declare class SchedulesService {
    private readonly scheduleRepository;
    constructor(scheduleRepository: Repository<Schedule>);
    findAll(): Promise<Schedule[]>;
    create(data: Partial<Schedule>): Promise<Schedule>;
    update(id: number, data: Partial<Schedule>): Promise<Schedule>;
    remove(id: number): Promise<void>;
}

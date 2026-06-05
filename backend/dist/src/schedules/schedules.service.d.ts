import { Repository } from 'typeorm';
import { Schedule } from './schedule.entity';
export declare class SchedulesService {
    private readonly scheduleRepository;
    constructor(scheduleRepository: Repository<Schedule>);
    findAll(): Promise<Schedule[]>;
    findTodayOfficers(): Promise<any[]>;
    create(data: Partial<Schedule>): Promise<Schedule>;
    update(id: number, data: Partial<Schedule>): Promise<Schedule>;
    remove(id: number): Promise<void>;
}

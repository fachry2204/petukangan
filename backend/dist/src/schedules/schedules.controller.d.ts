import { SchedulesService } from './schedules.service';
import { Schedule } from './schedule.entity';
export declare class SchedulesController {
    private readonly schedulesService;
    constructor(schedulesService: SchedulesService);
    getSchedules(): Promise<Schedule[]>;
    createSchedule(data: Partial<Schedule>): Promise<Schedule>;
    updateSchedule(id: number, data: Partial<Schedule>): Promise<Schedule>;
    deleteSchedule(id: number): Promise<{
        success: boolean;
    }>;
}

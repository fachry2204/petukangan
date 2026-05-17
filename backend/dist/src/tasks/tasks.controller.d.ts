import { TasksService } from './tasks.service';
export declare class TasksController {
    private tasksService;
    constructor(tasksService: TasksService);
    getMyTasks(req: any): Promise<import("./task.entity").Task[]>;
    getTask(id: number): Promise<import("./task.entity").Task>;
    updateStatus(id: number, req: any, body: any): Promise<import("./task.entity").Task>;
    createTask(req: any, body: any): Promise<import("./task.entity").Task>;
}

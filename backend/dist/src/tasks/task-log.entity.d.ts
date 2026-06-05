import { Task } from './task.entity';
export declare class TaskLog {
    id: number;
    task: Task;
    status: string;
    lat: number;
    lng: number;
    address: string;
    photoUrl: string;
    note: string;
    createdAt: Date;
}

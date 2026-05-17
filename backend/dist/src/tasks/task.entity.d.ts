import { User } from '../users/user.entity';
import { Zone } from '../zones/zone.entity';
import { TaskLog } from './task-log.entity';
export declare class Task {
    id: number;
    title: string;
    description: string;
    zone: Zone;
    assignedTo: User;
    status: string;
    priority: string;
    deadline: Date;
    photoUrl: string;
    lat: number;
    lng: number;
    address: string;
    createdAt: Date;
    updatedAt: Date;
    logs: TaskLog[];
}

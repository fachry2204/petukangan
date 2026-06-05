import { User } from '../users/user.entity';
export declare class AttendanceRequest {
    id: number;
    user: User;
    timestamp: Date;
    lat: number;
    lng: number;
    address: string;
    reason: string;
    status: string;
    rejectionReason: string;
}

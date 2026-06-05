import { User } from '../users/user.entity';
export declare class Attendance {
    id: number;
    user: User;
    type: string;
    timestamp: Date;
    lat: number;
    lng: number;
    address: string;
    photoUrl: string;
    reason: string;
    deviceInfo: any;
    isMock: boolean;
    status: string;
    isOutsideSchedule: boolean;
    rejectionReason: string;
}

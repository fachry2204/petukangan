import { User } from '../users/user.entity';
export declare class GPSTracking {
    id: number;
    user: User;
    lat: number;
    lng: number;
    speed: number;
    batteryLevel: number;
    isMock: boolean;
    timestamp: Date;
}

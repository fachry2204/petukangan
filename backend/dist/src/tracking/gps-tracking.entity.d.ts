import { User } from '../users/user.entity';
export declare class GPSTracking {
    id: number;
    user: User;
    lat: number;
    lng: number;
    speed: number;
    batteryLevel: number;
    isMock: boolean;
    ipAddress: string;
    wifiName: string;
    provider: string;
    statusAbsen: string;
    timestamp: Date;
}

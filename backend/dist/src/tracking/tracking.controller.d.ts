import { TrackingService } from './tracking.service';
export declare class TrackingController {
    private readonly trackingService;
    constructor(trackingService: TrackingService);
    getHistory(minutes?: string): Promise<{
        minutes: number;
        purged: number;
        count: number;
        points: any[];
    }>;
    getGPSHistory(startDate: string, endDate: string, userId?: string): Promise<{
        startDate: string;
        endDate: string;
        count: number;
        points: any[];
    }>;
    getActiveUsers(startDate: string, endDate: string): Promise<{
        users: any[];
    }>;
    purgeOld(minutes?: string): Promise<{
        minutes: number;
        purged: number;
    }>;
}

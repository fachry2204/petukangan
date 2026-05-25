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
    purgeOld(minutes?: string): Promise<{
        minutes: number;
        purged: number;
    }>;
}

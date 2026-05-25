import { Repository } from 'typeorm';
import { GPSTracking } from './gps-tracking.entity';
export declare const GPS_RETENTION_MINUTES = 5;
export declare class TrackingService {
    private gpsRepository;
    constructor(gpsRepository: Repository<GPSTracking>);
    saveLocation(userId: number, data: any): Promise<GPSTracking>;
    getLatestLocations(): Promise<never[]>;
    purgeOldHistory(minutes?: number): Promise<number>;
    getHistoryWithin(minutes?: number): Promise<any[]>;
}

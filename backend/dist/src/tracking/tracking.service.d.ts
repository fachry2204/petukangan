import { Repository } from 'typeorm';
import { GPSTracking } from './gps-tracking.entity';
export declare class TrackingService {
    private gpsRepository;
    constructor(gpsRepository: Repository<GPSTracking>);
    saveLocation(userId: number, data: any): Promise<GPSTracking>;
    getLatestLocations(): Promise<never[]>;
}

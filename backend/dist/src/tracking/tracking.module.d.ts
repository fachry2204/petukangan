import { OnModuleInit } from '@nestjs/common';
import { TrackingService } from './tracking.service';
export declare class TrackingModule implements OnModuleInit {
    private readonly trackingService;
    constructor(trackingService: TrackingService);
    onModuleInit(): void;
}

import { OnModuleInit } from '@nestjs/common';
import { Repository } from 'typeorm';
import { SystemSetting } from './setting.entity';
export declare class SettingsService implements OnModuleInit {
    private readonly settingsRepo;
    constructor(settingsRepo: Repository<SystemSetting>);
    onModuleInit(): Promise<void>;
    getSettings(): Promise<SystemSetting>;
    updateSettings(data: Partial<SystemSetting>): Promise<SystemSetting>;
}

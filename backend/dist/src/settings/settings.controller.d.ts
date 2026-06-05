import { SettingsService } from './settings.service';
import { SystemSetting } from './setting.entity';
export declare class SettingsController {
    private readonly settingsService;
    constructor(settingsService: SettingsService);
    getSettings(): Promise<SystemSetting>;
    updateSettings(data: Partial<SystemSetting>): Promise<SystemSetting>;
}

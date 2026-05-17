import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { SystemSetting } from './setting.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  async getSettings(): Promise<SystemSetting> {
    return this.settingsService.getSettings();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async updateSettings(@Body() data: Partial<SystemSetting>): Promise<SystemSetting> {
    return this.settingsService.updateSettings(data);
  }
}

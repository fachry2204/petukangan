import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from './setting.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SettingsService implements OnModuleInit {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settingsRepo: Repository<SystemSetting>,
  ) {}

  async onModuleInit() {
    // Seed default settings if none exist
    const count = await this.settingsRepo.count();
    if (count === 0) {
      const defaultSettings = this.settingsRepo.create({
        shifts: [
          { name: 'Shift Pagi', startTime: '08:00' },
          { name: 'Shift Siang', startTime: '14:00' },
          { name: 'Shift Malam', startTime: '22:00' }
        ],
        zones: ['Zona A', 'Zona B', 'Zona C', 'Zona D']
      });
      await this.settingsRepo.save(defaultSettings);
      console.log('Seeded default system settings in database.');
    }
  }

  async getSettings(): Promise<SystemSetting> {
    let settings = await this.settingsRepo.findOne({ where: {} });
    if (!settings) {
      settings = this.settingsRepo.create({
        shifts: [
          { name: 'Shift Pagi', startTime: '08:00' },
          { name: 'Shift Siang', startTime: '14:00' },
          { name: 'Shift Malam', startTime: '22:00' }
        ],
        zones: ['Zona A', 'Zona B', 'Zona C', 'Zona D']
      });
      await this.settingsRepo.save(settings);
    } else {
      let updated = false;
      if (!settings.shifts || settings.shifts.length === 0 || typeof settings.shifts[0] === 'string') {
        settings.shifts = [
          { name: 'Shift Pagi', startTime: '08:00' },
          { name: 'Shift Siang', startTime: '14:00' },
          { name: 'Shift Malam', startTime: '22:00' }
        ];
        updated = true;
      }
      if (!settings.zones) {
        settings.zones = ['Zona A', 'Zona B', 'Zona C', 'Zona D'];
        updated = true;
      }
      if (updated) {
        await this.settingsRepo.save(settings);
      }
    }
    return settings;
  }

  async updateSettings(data: Partial<SystemSetting>): Promise<SystemSetting> {
    const settings = await this.getSettings();

    // If the new background type is video, delete the previous background image from public storage
    if (data.bgType === 'video') {
      const targetBgImage = settings.bgImage;
      
      if (targetBgImage && targetBgImage.startsWith('/uploads/')) {
        try {
          const absolutePath = path.join('d:', 'xampp', 'htdocs', 'petukangan', 'public', targetBgImage.replace(/\//g, path.sep));
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`Deleted background image file to save storage: ${absolutePath}`);
          }
        } catch (error: any) {
          console.error(`Failed to delete background image file: ${error.message}`);
        }
      }
      
      // Clear background image field in both settings object and payload
      settings.bgImage = '';
      if (data.bgImage !== undefined) {
        data.bgImage = '';
      }
    }

    Object.assign(settings, data);
    return this.settingsRepo.save(settings);
  }
}

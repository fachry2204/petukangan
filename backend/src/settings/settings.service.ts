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
    // Hanya buat record kosong jika belum ada sama sekali di database
    // Tidak ada nilai hardcoded — admin yang mengisi via halaman Settings
    const count = await this.settingsRepo.count();
    if (count === 0) {
      const initial = this.settingsRepo.create({
        shifts: [],
        zones: [],
      });
      await this.settingsRepo.save(initial);
      console.log('[Settings] Inisialisasi record settings kosong di database. Silakan konfigurasi via halaman Settings.');
    }
  }

  async getSettings(): Promise<SystemSetting> {
    let settings = await this.settingsRepo.findOne({ where: {} });
    if (!settings) {
      // Fallback jika record tidak ditemukan (seharusnya tidak terjadi setelah onModuleInit)
      settings = this.settingsRepo.create({ shifts: [], zones: [] });
      await this.settingsRepo.save(settings);
    }

    // Pastikan shifts & zones selalu array (bukan null) untuk keamanan frontend
    if (!settings.shifts) settings.shifts = [];
    if (!settings.zones) settings.zones = [];

    return settings;
  }

  async updateSettings(data: Partial<SystemSetting>): Promise<SystemSetting> {
    const settings = await this.getSettings();

    // Jika background diganti ke video, hapus file gambar lama dari storage
    if (data.bgType === 'video') {
      const targetBgImage = settings.bgImage;
      if (targetBgImage && targetBgImage.startsWith('/uploads/')) {
        try {
          const absolutePath = path.join('d:', 'xampp', 'htdocs', 'petukangan', 'public', targetBgImage.replace(/\//g, path.sep));
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`[Settings] Deleted old background image: ${absolutePath}`);
          }
        } catch (error: any) {
          console.error(`[Settings] Failed to delete background image: ${error.message}`);
        }
      }
      settings.bgImage = '';
      if (data.bgImage !== undefined) data.bgImage = '';
    }

    Object.assign(settings, data);
    return this.settingsRepo.save(settings);
  }
}

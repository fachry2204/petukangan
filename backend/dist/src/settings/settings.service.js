"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const setting_entity_1 = require("./setting.entity");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let SettingsService = class SettingsService {
    settingsRepo;
    constructor(settingsRepo) {
        this.settingsRepo = settingsRepo;
    }
    async onModuleInit() {
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
    async getSettings() {
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
        }
        else {
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
    async updateSettings(data) {
        const settings = await this.getSettings();
        if (data.bgType === 'video') {
            const targetBgImage = settings.bgImage;
            if (targetBgImage && targetBgImage.startsWith('/uploads/')) {
                try {
                    const absolutePath = path.join('d:', 'xampp', 'htdocs', 'petukangan', 'public', targetBgImage.replace(/\//g, path.sep));
                    if (fs.existsSync(absolutePath)) {
                        fs.unlinkSync(absolutePath);
                        console.log(`Deleted background image file to save storage: ${absolutePath}`);
                    }
                }
                catch (error) {
                    console.error(`Failed to delete background image file: ${error.message}`);
                }
            }
            settings.bgImage = '';
            if (data.bgImage !== undefined) {
                data.bgImage = '';
            }
        }
        Object.assign(settings, data);
        return this.settingsRepo.save(settings);
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(setting_entity_1.SystemSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SettingsService);
//# sourceMappingURL=settings.service.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemSetting = void 0;
const typeorm_1 = require("typeorm");
let SystemSetting = class SystemSetting {
    id;
    logoUrl;
    bgType;
    bgImage;
    bgVideo;
    bgVideoVolume;
    systemName;
    systemDescription;
    mainColor;
    maintenanceActive;
    maintenanceEnd;
    maintenanceTitle;
    maintenanceDesc;
    shifts;
    zones;
    updatedAt;
};
exports.SystemSetting = SystemSetting;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SystemSetting.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '/logodki.png' }),
    __metadata("design:type", String)
], SystemSetting.prototype, "logoUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'image' }),
    __metadata("design:type", String)
], SystemSetting.prototype, "bgType", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '/bg.jpg' }),
    __metadata("design:type", String)
], SystemSetting.prototype, "bgImage", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], SystemSetting.prototype, "bgVideo", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 0 }),
    __metadata("design:type", Number)
], SystemSetting.prototype, "bgVideoVolume", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'SIPETUT' }),
    __metadata("design:type", String)
], SystemSetting.prototype, "systemName", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Monitoring & Management System' }),
    __metadata("design:type", String)
], SystemSetting.prototype, "systemDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '#f97316' }),
    __metadata("design:type", String)
], SystemSetting.prototype, "mainColor", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: false }),
    __metadata("design:type", Boolean)
], SystemSetting.prototype, "maintenanceActive", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: '' }),
    __metadata("design:type", String)
], SystemSetting.prototype, "maintenanceEnd", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'Sistem Dalam Perbaikan' }),
    __metadata("design:type", String)
], SystemSetting.prototype, "maintenanceTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', default: 'Kami sedang melakukan pemeliharaan sistem. Silakan kembali lagi nanti.' }),
    __metadata("design:type", String)
], SystemSetting.prototype, "maintenanceDesc", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], SystemSetting.prototype, "shifts", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'simple-json', nullable: true }),
    __metadata("design:type", Array)
], SystemSetting.prototype, "zones", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)(),
    __metadata("design:type", Date)
], SystemSetting.prototype, "updatedAt", void 0);
exports.SystemSetting = SystemSetting = __decorate([
    (0, typeorm_1.Entity)('system_settings')
], SystemSetting);
//# sourceMappingURL=setting.entity.js.map
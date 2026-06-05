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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZonesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const zone_entity_1 = require("./zone.entity");
let ZonesService = class ZonesService {
    zoneRepository;
    constructor(zoneRepository) {
        this.zoneRepository = zoneRepository;
    }
    async create(data) {
        const zone = this.zoneRepository.create(data);
        return this.zoneRepository.save(zone);
    }
    async findAll() {
        return this.zoneRepository.find({ relations: ['users'] });
    }
    async findOne(id) {
        const zone = await this.zoneRepository.findOne({
            where: { id },
            relations: ['users']
        });
        if (!zone)
            throw new common_1.NotFoundException('Zona tidak ditemukan');
        return zone;
    }
    async update(id, data) {
        await this.zoneRepository.update(id, data);
        return this.findOne(id);
    }
    async remove(id) {
        const zone = await this.findOne(id);
        return this.zoneRepository.remove(zone);
    }
};
exports.ZonesService = ZonesService;
exports.ZonesService = ZonesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(zone_entity_1.Zone)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ZonesService);
//# sourceMappingURL=zones.service.js.map
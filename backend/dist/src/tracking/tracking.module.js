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
exports.TrackingModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const tracking_gateway_1 = require("./tracking.gateway");
const tracking_service_1 = require("./tracking.service");
const tracking_controller_1 = require("./tracking.controller");
const gps_tracking_entity_1 = require("./gps-tracking.entity");
let TrackingModule = class TrackingModule {
    trackingService;
    constructor(trackingService) {
        this.trackingService = trackingService;
    }
    onModuleInit() {
        setInterval(() => {
            this.trackingService
                .purgeOldHistory(tracking_service_1.GPS_RETENTION_MINUTES)
                .catch((err) => console.error('[Tracking] purgeOldHistory failed:', err?.message || err));
        }, 60 * 1000);
    }
};
exports.TrackingModule = TrackingModule;
exports.TrackingModule = TrackingModule = __decorate([
    (0, common_1.Module)({
        imports: [typeorm_1.TypeOrmModule.forFeature([gps_tracking_entity_1.GPSTracking])],
        controllers: [tracking_controller_1.TrackingController],
        providers: [tracking_gateway_1.TrackingGateway, tracking_service_1.TrackingService],
        exports: [tracking_service_1.TrackingService, tracking_gateway_1.TrackingGateway],
    }),
    __metadata("design:paramtypes", [tracking_service_1.TrackingService])
], TrackingModule);
//# sourceMappingURL=tracking.module.js.map
"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommonModule = void 0;
const common_1 = require("@nestjs/common");
const anti_manipulation_service_1 = require("./anti-manipulation.service");
const geofence_service_1 = require("./geofence.service");
const file_service_1 = require("./file.service");
let CommonModule = class CommonModule {
};
exports.CommonModule = CommonModule;
exports.CommonModule = CommonModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        providers: [anti_manipulation_service_1.AntiManipulationService, geofence_service_1.GeofenceService, file_service_1.FileService],
        exports: [anti_manipulation_service_1.AntiManipulationService, geofence_service_1.GeofenceService, file_service_1.FileService],
    })
], CommonModule);
//# sourceMappingURL=common.module.js.map
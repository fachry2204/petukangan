"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const typeorm_1 = require("@nestjs/typeorm");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const attendance_module_1 = require("./attendance/attendance.module");
const tasks_module_1 = require("./tasks/tasks.module");
const reports_module_1 = require("./reports/reports.module");
const tracking_module_1 = require("./tracking/tracking.module");
const zones_module_1 = require("./zones/zones.module");
const shifts_module_1 = require("./shifts/shifts.module");
const database_module_1 = require("./database/database.module");
const common_module_1 = require("./common/common.module");
const settings_module_1 = require("./settings/settings.module");
const schedules_module_1 = require("./schedules/schedules.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            common_module_1.CommonModule,
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                imports: [config_1.ConfigModule],
                useFactory: (configService) => ({
                    type: 'mysql',
                    host: configService.get('DB_HOST'),
                    port: configService.get('DB_PORT') || 3306,
                    username: configService.get('DB_USER'),
                    password: configService.get('DB_PASSWORD') || '',
                    database: configService.get('DB_NAME'),
                    entities: [__dirname + '/**/*.entity{.ts,.js}'],
                    synchronize: true,
                }),
                inject: [config_1.ConfigService],
            }),
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            attendance_module_1.AttendanceModule,
            tasks_module_1.TasksModule,
            reports_module_1.ReportsModule,
            tracking_module_1.TrackingModule,
            zones_module_1.ZonesModule,
            shifts_module_1.ShiftsModule,
            database_module_1.DatabaseModule,
            settings_module_1.SettingsModule,
            schedules_module_1.SchedulesModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map
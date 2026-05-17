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
exports.TasksService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const task_entity_1 = require("./task.entity");
const task_log_entity_1 = require("./task-log.entity");
const file_service_1 = require("../common/file.service");
let TasksService = class TasksService {
    taskRepository;
    taskLogRepository;
    fileService;
    constructor(taskRepository, taskLogRepository, fileService) {
        this.taskRepository = taskRepository;
        this.taskLogRepository = taskLogRepository;
        this.fileService = fileService;
    }
    async findAll(userId) {
        const query = this.taskRepository.createQueryBuilder('task')
            .leftJoinAndSelect('task.zone', 'zone')
            .leftJoinAndSelect('task.assignedTo', 'user');
        if (userId) {
            query.where('task.assignedToId = :userId', { userId });
        }
        return query.getMany();
    }
    async findOne(id) {
        const task = await this.taskRepository.findOne({
            where: { id },
            relations: ['zone', 'assignedTo', 'logs']
        });
        if (!task)
            throw new common_1.NotFoundException('Tugas tidak ditemukan');
        return task;
    }
    async updateStatus(id, userId, data) {
        const task = await this.findOne(id);
        if (task.assignedTo?.id !== userId) {
            throw new common_1.BadRequestException('Tugas ini tidak ditugaskan kepada Anda');
        }
        let photoUrl = undefined;
        if (data.photo) {
            photoUrl = await this.fileService.saveBase64Image('tugas', userId, data.photo);
        }
        else if (['ON_WAY', 'BEFORE', 'WORKING', 'DONE', 'VERIFY'].includes(data.status)) {
            throw new common_1.BadRequestException('Foto wajib disertakan untuk perubahan status ini');
        }
        const log = this.taskLogRepository.create({
            task,
            status: data.status,
            lat: data.lat,
            lng: data.lng,
            address: data.address,
            photoUrl: photoUrl || undefined,
            note: data.note,
        });
        await this.taskLogRepository.save(log);
        task.status = data.status;
        return this.taskRepository.save(task);
    }
    async create(userId, data) {
        let finalPhotoUrl = data.photoUrl;
        if (data.photoUrl && data.photoUrl.startsWith('data:image')) {
            finalPhotoUrl = await this.fileService.saveBase64Image('tugas', userId, data.photoUrl);
        }
        const task = this.taskRepository.create({
            title: data.title,
            description: data.description || '',
            status: 'TODO',
            priority: 'MEDIUM',
            assignedTo: { id: userId },
            zone: data.zoneId ? { id: Number(data.zoneId) } : undefined,
            deadline: data.deadline ? new Date(data.deadline) : undefined,
            photoUrl: finalPhotoUrl,
            lat: data.lat,
            lng: data.lng,
            address: data.address,
        });
        return this.taskRepository.save(task);
    }
};
exports.TasksService = TasksService;
exports.TasksService = TasksService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(task_entity_1.Task)),
    __param(1, (0, typeorm_1.InjectRepository)(task_log_entity_1.TaskLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        file_service_1.FileService])
], TasksService);
//# sourceMappingURL=tasks.service.js.map
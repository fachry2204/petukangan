import { Injectable, BadRequestException, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskLog } from './task-log.entity';
import { FileService } from '../common/file.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(TaskLog)
    private taskLogRepository: Repository<TaskLog>,
    private fileService: FileService,
    @Inject(forwardRef(() => TrackingGateway))
    private trackingGateway: TrackingGateway,
  ) {}

  async findAll(userId?: number) {
    const query = this.taskRepository.createQueryBuilder('task')
      .leftJoinAndSelect('task.zone', 'zone')
      .leftJoinAndSelect('task.assignedTo', 'user');
    
    if (userId) {
      query.where('task.assignedToId = :userId', { userId });
    }

    return query.getMany();
  }

  async findOne(id: number) {
    const task = await this.taskRepository.findOne({ 
      where: { id },
      relations: ['zone', 'assignedTo', 'logs'] 
    });
    if (!task) throw new NotFoundException('Tugas tidak ditemukan');
    return task;
  }

  async updateStatus(id: number, userId: number, data: any) {
    const task = await this.findOne(id);
    
    if (task.assignedTo?.id !== userId) {
      throw new BadRequestException('Tugas ini tidak ditugaskan kepada Anda');
    }

    // Save photo if provided
    let photoUrl: string | undefined = undefined;

    if (data.photo) {
      photoUrl = await this.fileService.saveBase64Image('tugas', userId, data.photo);
    } else if (['WORKING', 'VERIFY'].includes(data.status)) {
      throw new BadRequestException('Foto wajib disertakan untuk perubahan status ini');
    }

    // Validate allowed transitions
    const currentStatus = task.status;
    const newStatus = data.status;
    const allowedTransitions: Record<string, string[]> = {
      TASK_NEW: ['NOT_STARTED'],
      NOT_STARTED: ['WORKING'],
      WORKING: ['VERIFY'],
      VERIFY: ['DONE'],
    };
    if (allowedTransitions[currentStatus] && !allowedTransitions[currentStatus].includes(newStatus)) {
      throw new BadRequestException(`Transisi dari ${currentStatus} ke ${newStatus} tidak diperbolehkan`);
    }

    // Create log
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

    // Update task status
    task.status = data.status;
    const savedTask = await this.taskRepository.save(task);
    this.trackingGateway.emitTaskChange('update', savedTask);
    return savedTask;
  }

  async update(id: number, data: any) {
    const task = await this.findOne(id);

    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.status !== undefined) task.status = data.status;
    if (data.priority !== undefined) task.priority = data.priority;
    if (data.taskType !== undefined) task.taskType = data.taskType;
    if (data.lat !== undefined) task.lat = data.lat;
    if (data.lng !== undefined) task.lng = data.lng;
    if (data.address !== undefined) task.address = data.address;
    if (data.deadline !== undefined) task.deadline = data.deadline ? new Date(data.deadline) : (null as any);
    if (data.assignedToId !== undefined) {
      task.assignedTo = data.assignedToId ? ({ id: Number(data.assignedToId) } as any) : (null as any);
    }
    if (data.zoneId !== undefined) {
      task.zone = data.zoneId ? ({ id: Number(data.zoneId) } as any) : (null as any);
    }

    const savedTask = await this.taskRepository.save(task);
    this.trackingGateway.emitTaskChange('update', savedTask);
    return savedTask;
  }

  async remove(id: number) {
    const task = await this.findOne(id);
    // Remove dependent logs first to avoid FK violation
    await this.taskLogRepository.delete({ task: { id } as any });
    await this.taskRepository.delete(id);
    this.trackingGateway.emitTaskChange('delete', { id });
    return { id, deleted: true };
  }

  async create(userId: number, data: any) {
    let finalPhotoUrl = data.photoUrl;
    if (data.photoUrl && data.photoUrl.startsWith('data:image')) {
      finalPhotoUrl = await this.fileService.saveBase64Image('tugas', userId, data.photoUrl);
    }

    const isAssigned = data.taskType === 'ASSIGNED';
    const task = this.taskRepository.create({
      title: data.title,
      description: data.description || '',
      status: isAssigned ? 'TASK_NEW' : 'NOT_STARTED',
      priority: 'MEDIUM',
      taskType: data.taskType || 'SELF',
      assignedTo: { id: userId } as any,
      zone: data.zoneId ? { id: Number(data.zoneId) } as any : undefined,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      photoUrl: finalPhotoUrl,
      lat: data.lat,
      lng: data.lng,
      address: data.address,
    });
    const savedTask = await this.taskRepository.save(task);
    this.trackingGateway.emitTaskChange('create', savedTask);
    return savedTask;
  }
}

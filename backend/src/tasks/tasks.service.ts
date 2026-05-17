import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './task.entity';
import { TaskLog } from './task-log.entity';
import { FileService } from '../common/file.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(Task)
    private taskRepository: Repository<Task>,
    @InjectRepository(TaskLog)
    private taskLogRepository: Repository<TaskLog>,
    private fileService: FileService,
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
    } else if (['ON_WAY', 'BEFORE', 'WORKING', 'DONE', 'VERIFY'].includes(data.status)) {
      throw new BadRequestException('Foto wajib disertakan untuk perubahan status ini');
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
    return this.taskRepository.save(task);
  }

  async create(userId: number, data: any) {
    let finalPhotoUrl = data.photoUrl;
    if (data.photoUrl && data.photoUrl.startsWith('data:image')) {
      finalPhotoUrl = await this.fileService.saveBase64Image('tugas', userId, data.photoUrl);
    }

    const task = this.taskRepository.create({
      title: data.title,
      description: data.description || '',
      status: 'TODO',
      priority: 'MEDIUM',
      assignedTo: { id: userId } as any,
      zone: data.zoneId ? { id: Number(data.zoneId) } as any : undefined,
      deadline: data.deadline ? new Date(data.deadline) : undefined,
      photoUrl: finalPhotoUrl,
      lat: data.lat,
      lng: data.lng,
      address: data.address,
    });
    return this.taskRepository.save(task);
  }
}

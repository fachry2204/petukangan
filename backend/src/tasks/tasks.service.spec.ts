import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './task.entity';
import { TaskLog } from './task-log.entity';
import { FileService } from '../common/file.service';
import { TrackingGateway } from '../tracking/tracking.gateway';

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: Record<string, jest.Mock>;
  let taskLogRepo: Record<string, jest.Mock>;
  let fileService: Record<string, jest.Mock>;
  let trackingGateway: Record<string, jest.Mock>;

  beforeEach(async () => {
    taskRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    taskLogRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    fileService = {
      saveBase64Image: jest.fn().mockResolvedValue('/gambar/tugas/1/photo.jpg'),
    };
    trackingGateway = {
      emitTaskChange: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(TaskLog), useValue: taskLogRepo },
        { provide: FileService, useValue: fileService },
        { provide: TrackingGateway, useValue: trackingGateway },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);
  });

  describe('findAll', () => {
    it('should return all tasks without filter', async () => {
      const tasks = [{ id: 1 }, { id: 2 }];
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(tasks),
      };
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findAll();
      expect(result).toEqual(tasks);
      expect(qb.where).not.toHaveBeenCalled();
    });

    it('should filter by userId when provided', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([{ id: 1 }]),
      };
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(5);
      expect(qb.where).toHaveBeenCalledWith('task.assignedToId = :userId', { userId: 5 });
    });
  });

  describe('findOne', () => {
    it('should return a task with relations', async () => {
      const task = { id: 1, title: 'Task A' };
      taskRepo.findOne.mockResolvedValue(task);

      const result = await service.findOne(1);
      expect(result).toEqual(task);
      expect(taskRepo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['zone', 'assignedTo', 'logs'],
      });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    const makeTask = (status: string, assignedToId: number) => ({
      id: 1,
      status,
      assignedTo: { id: assignedToId },
    });

    it('should reject when user is not assigned', async () => {
      taskRepo.findOne.mockResolvedValue(makeTask('TASK_NEW', 2));

      await expect(
        service.updateStatus(1, 99, { status: 'TASK_ACCEPTED', photo: 'x' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject invalid status transition', async () => {
      taskRepo.findOne.mockResolvedValue(makeTask('TASK_NEW', 1));
      // TASK_NEW → ARRIVED is not allowed (should be TASK_ACCEPTED)
      await expect(
        service.updateStatus(1, 1, { status: 'ARRIVED', photo: 'data:image/jpeg;base64,abc' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid TASK_NEW → TASK_ACCEPTED transition', async () => {
      const task = makeTask('TASK_NEW', 1);
      taskRepo.findOne.mockResolvedValue(task);
      taskLogRepo.create.mockReturnValue({ id: 10 });
      taskLogRepo.save.mockResolvedValue({ id: 10 });
      taskRepo.save.mockResolvedValue({ ...task, status: 'TASK_ACCEPTED' });

      const result = await service.updateStatus(1, 1, {
        status: 'TASK_ACCEPTED',
      });
      expect(result.status).toBe('TASK_ACCEPTED');
    });

    it('should require photo for ARRIVED status', async () => {
      const task = makeTask('TASK_ACCEPTED', 1);
      taskRepo.findOne.mockResolvedValue(task);

      await expect(
        service.updateStatus(1, 1, { status: 'ARRIVED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should save photo and transition TASK_ACCEPTED → ARRIVED', async () => {
      const task = makeTask('TASK_ACCEPTED', 1);
      taskRepo.findOne.mockResolvedValue(task);
      taskLogRepo.create.mockReturnValue({ id: 10 });
      taskLogRepo.save.mockResolvedValue({ id: 10 });
      taskRepo.save.mockResolvedValue({ ...task, status: 'ARRIVED' });

      const result = await service.updateStatus(1, 1, {
        status: 'ARRIVED',
        photo: 'data:image/jpeg;base64,abc',
      });
      expect(fileService.saveBase64Image).toHaveBeenCalledWith('tugas', 1, 'data:image/jpeg;base64,abc');
      expect(result.status).toBe('ARRIVED');
    });
  });

  describe('remove', () => {
    it('should delete task logs and then the task', async () => {
      const task = { id: 1, title: 'Task' };
      taskRepo.findOne.mockResolvedValue(task);
      taskLogRepo.delete.mockResolvedValue({ affected: 2 });
      taskRepo.delete.mockResolvedValue({ affected: 1 });

      const result = await service.remove(1);
      expect(taskLogRepo.delete).toHaveBeenCalledWith({ task: { id: 1 } });
      expect(taskRepo.delete).toHaveBeenCalledWith(1);
      expect(result).toEqual({ id: 1, deleted: true });
      expect(trackingGateway.emitTaskChange).toHaveBeenCalledWith('delete', { id: 1 });
    });

    it('should throw NotFoundException when task does not exist', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});

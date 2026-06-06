import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { Schedule } from './schedule.entity';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: getRepositoryToken(Schedule), useValue: repo },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
  });

  describe('findAll', () => {
    it('should return all schedules ordered by date DESC', async () => {
      const schedules = [{ id: 2 }, { id: 1 }];
      repo.find.mockResolvedValue(schedules);

      const result = await service.findAll();
      expect(repo.find).toHaveBeenCalledWith({
        order: { date: 'DESC', id: 'DESC' },
      });
      expect(result).toEqual(schedules);
    });
  });

  describe('findTodayOfficers', () => {
    it('should extract officers from today schedules', async () => {
      const schedules = [
        {
          assignedUsers: [
            { id: 1, fullName: 'Budi', photoUrl: '/budi.jpg' },
            { id: 2, fullName: 'Andi', photoUrl: '/andi.jpg' },
          ],
          timeRange: '08:00 - 16:00',
        },
      ];
      repo.find.mockResolvedValue(schedules);

      const result = await service.findTodayOfficers();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        userId: 1,
        fullName: 'Budi',
        photoUrl: '/budi.jpg',
        scheduleTime: '08:00 - 16:00',
      });
      expect(result[1].userId).toBe(2);
    });

    it('should return empty array when no schedules exist today', async () => {
      repo.find.mockResolvedValue([]);

      const result = await service.findTodayOfficers();
      expect(result).toEqual([]);
    });

    it('should handle schedules with null assignedUsers', async () => {
      repo.find.mockResolvedValue([
        { assignedUsers: null, timeRange: '08:00 - 16:00' },
      ]);

      const result = await service.findTodayOfficers();
      expect(result).toEqual([]);
    });

    it('should use fallback name when fullName is missing', async () => {
      repo.find.mockResolvedValue([
        {
          assignedUsers: [{ id: 5 }],
          timeRange: null,
        },
      ]);

      const result = await service.findTodayOfficers();
      expect(result[0].fullName).toBe('Petugas 5');
      expect(result[0].scheduleTime).toBe('-');
    });
  });

  describe('create', () => {
    it('should create and save a schedule', async () => {
      const data = { date: new Date(), timeRange: '08:00 - 16:00' };
      const schedule = { id: 1, ...data };
      repo.create.mockReturnValue(schedule);
      repo.save.mockResolvedValue(schedule);

      const result = await service.create(data);
      expect(repo.create).toHaveBeenCalledWith(data);
      expect(result).toEqual(schedule);
    });
  });

  describe('update', () => {
    it('should update an existing schedule', async () => {
      const existing = { id: 1, timeRange: '08:00 - 16:00' };
      repo.findOne.mockResolvedValue(existing);
      repo.save.mockResolvedValue({ ...existing, timeRange: '09:00 - 17:00' });

      const result = await service.update(1, { timeRange: '09:00 - 17:00' });
      expect(result.timeRange).toBe('09:00 - 17:00');
    });

    it('should throw NotFoundException when schedule does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.update(999, {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete a schedule', async () => {
      repo.delete.mockResolvedValue({ affected: 1 });

      await expect(service.remove(1)).resolves.not.toThrow();
      expect(repo.delete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when schedule to delete does not exist', async () => {
      repo.delete.mockResolvedValue({ affected: 0 });

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});

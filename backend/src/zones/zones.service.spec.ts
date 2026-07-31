import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { Zone } from './zone.entity';

describe('ZonesService', () => {
  let service: ZonesService;
  let repo: Record<string, jest.Mock>;

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ZonesService,
        { provide: getRepositoryToken(Zone), useValue: repo },
      ],
    }).compile();

    service = module.get<ZonesService>(ZonesService);
  });

  describe('create', () => {
    it('should create and save a zone', async () => {
      const data = { name: 'Zone A', boundary: [] };
      const zone = { id: 1, ...data };
      repo.create.mockReturnValue(zone);
      repo.save.mockResolvedValue(zone);

      const result = await service.create(data);
      expect(repo.create).toHaveBeenCalledWith(data);
      expect(repo.save).toHaveBeenCalledWith(zone);
      expect(result).toEqual(zone);
    });
  });

  describe('findAll', () => {
    it('should return all zones with users relation', async () => {
      const zones = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }];
      repo.find.mockResolvedValue(zones);

      const result = await service.findAll();
      expect(repo.find).toHaveBeenCalledWith({ relations: ['users'] });
      expect(result).toEqual(zones);
    });
  });

  describe('findOne', () => {
    it('should return a zone by id', async () => {
      const zone = { id: 1, name: 'Zone A' };
      repo.findOne.mockResolvedValue(zone);

      const result = await service.findOne(1);
      expect(repo.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
        relations: ['users'],
      });
      expect(result).toEqual(zone);
    });

    it('should throw NotFoundException when zone does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update and return the zone', async () => {
      const updated = { id: 1, name: 'Updated Zone' };
      repo.update.mockResolvedValue({ affected: 1 });
      repo.findOne.mockResolvedValue(updated);

      const result = await service.update(1, { name: 'Updated Zone' });
      expect(repo.update).toHaveBeenCalledWith(1, { name: 'Updated Zone' });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('should remove a zone', async () => {
      const zone = { id: 1, name: 'Zone A' };
      repo.findOne.mockResolvedValue(zone);
      repo.remove.mockResolvedValue(zone);

      const result = await service.remove(1);
      expect(repo.remove).toHaveBeenCalledWith(zone);
      expect(result).toEqual(zone);
    });

    it('should throw NotFoundException when zone to remove does not exist', async () => {
      repo.findOne.mockResolvedValue(null);

      await expect(service.remove(999)).rejects.toThrow(NotFoundException);
    });
  });
});

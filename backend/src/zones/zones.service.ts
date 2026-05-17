import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './zone.entity';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone)
    private zoneRepository: Repository<Zone>,
  ) {}

  async create(data: any) {
    const zone = this.zoneRepository.create(data);
    return this.zoneRepository.save(zone);
  }

  async findAll() {
    return this.zoneRepository.find({ relations: ['users'] });
  }

  async findOne(id: number) {
    const zone = await this.zoneRepository.findOne({ 
      where: { id },
      relations: ['users'] 
    });
    if (!zone) throw new NotFoundException('Zona tidak ditemukan');
    return zone;
  }

  async update(id: number, data: any) {
    await this.zoneRepository.update(id, data);
    return this.findOne(id);
  }

  async remove(id: number) {
    const zone = await this.findOne(id);
    return this.zoneRepository.remove(zone);
  }
}

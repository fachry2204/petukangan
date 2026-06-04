import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Schedule } from './schedule.entity';

@Injectable()
export class SchedulesService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  async findAll(): Promise<Schedule[]> {
    return this.scheduleRepository.find({
      order: {
        date: 'DESC',
        id: 'DESC',
      },
    });
  }

  async findTodayOfficers(): Promise<any[]> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const schedules = await this.scheduleRepository.find({
      where: {
        date: Between(today, tomorrow),
      },
    });

    // Extract assigned users from all today's schedules
    const officers: any[] = [];
    schedules.forEach(s => {
      if (s.assignedUsers && Array.isArray(s.assignedUsers)) {
        s.assignedUsers.forEach((user: any) => {
          officers.push({
            userId: user.id,
            fullName: user.fullName || user.name || `Petugas ${user.id}`,
            photoUrl: user.photoUrl,
            scheduleTime: s.timeRange || '-',
          });
        });
      }
    });

    return officers;
  }

  async create(data: Partial<Schedule>): Promise<Schedule> {
    const schedule = this.scheduleRepository.create(data);
    return this.scheduleRepository.save(schedule);
  }

  async update(id: number, data: Partial<Schedule>): Promise<Schedule> {
    const schedule = await this.scheduleRepository.findOne({ where: { id } });
    if (!schedule) {
      throw new NotFoundException('Jadwal tidak ditemukan');
    }
    Object.assign(schedule, data);
    return this.scheduleRepository.save(schedule);
  }

  async remove(id: number): Promise<void> {
    const result = await this.scheduleRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('Jadwal tidak ditemukan');
    }
  }
}

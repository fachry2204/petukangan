import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { Schedule } from './schedule.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('schedules')
@UseGuards(JwtAuthGuard)
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  async getSchedules(): Promise<Schedule[]> {
    return this.schedulesService.findAll();
  }

  @Post()
  async createSchedule(@Body() data: Partial<Schedule>): Promise<Schedule> {
    return this.schedulesService.create(data);
  }

  @Put(':id')
  async updateSchedule(@Param('id') id: number, @Body() data: Partial<Schedule>): Promise<Schedule> {
    return this.schedulesService.update(id, data);
  }

  @Delete(':id')
  async deleteSchedule(@Param('id') id: number): Promise<{ success: boolean }> {
    await this.schedulesService.remove(id);
    return { success: true };
  }
}

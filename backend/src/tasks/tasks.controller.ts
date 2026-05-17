import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Get()
  async getMyTasks(@Request() req) {
    return this.tasksService.findAll(req.user.role === 'PPSU' ? req.user.userId : undefined);
  }

  @Get(':id')
  async getTask(@Param('id') id: number) {
    return this.tasksService.findOne(id);
  }

  @Post(':id/status')
  async updateStatus(@Param('id') id: number, @Request() req, @Body() body: any) {
    return this.tasksService.updateStatus(id, req.user.userId, body);
  }

  @Post()
  async createTask(@Request() req, @Body() body: any) {
    return this.tasksService.create(req.user.userId, body);
  }
}

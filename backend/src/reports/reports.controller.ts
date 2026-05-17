import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get()
  async getAll() {
    return this.reportsService.findAll();
  }

  @Post()
  async create(@Request() req, @Body() body: any) {
    return this.reportsService.create(req.user.userId, body);
  }

  @Get(':id')
  async getOne(@Param('id') id: number) {
    return this.reportsService.findOne(id);
  }
}

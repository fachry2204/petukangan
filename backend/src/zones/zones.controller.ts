import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('zones')
@UseGuards(JwtAuthGuard)
export class ZonesController {
  constructor(private zonesService: ZonesService) {}

  @Get()
  async getAll() {
    return this.zonesService.findAll();
  }

  @Post()
  async create(@Body() body: any) {
    return this.zonesService.create(body);
  }

  @Get(':id')
  async getOne(@Param('id') id: number) {
    return this.zonesService.findOne(id);
  }

  @Put(':id')
  async update(@Param('id') id: number, @Body() body: any) {
    return this.zonesService.update(id, body);
  }

  @Delete(':id')
  async remove(@Param('id') id: number) {
    return this.zonesService.remove(id);
  }
}

import { Controller, Get, Post, Body, Param, Put, Delete, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './role.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    @InjectRepository(Role) private roleRepo: Repository<Role>
  ) {}

  @Get()
  async findAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return this.usersService.findById(parseInt(id, 10));
  }

  @Post()
  async create(@Body() body: any) {
    if (body.roleName) {
      const role = await this.roleRepo.findOne({ where: { name: body.roleName } });
      if (role) {
        body.role = role;
      }
    }
    return this.usersService.create(body);
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    if (body.roleName) {
      const role = await this.roleRepo.findOne({ where: { name: body.roleName } });
      if (role) {
        body.role = role;
      }
    }
    return this.usersService.update(parseInt(id, 10), body);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.usersService.remove(parseInt(id, 10));
  }
}


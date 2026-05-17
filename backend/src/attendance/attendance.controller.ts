import { Controller, Get, Post, Put, Body, UseGuards, Request, Param } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @UseGuards(JwtAuthGuard)
  @Get('admin')
  async getAdminAllAttendance() {
    return this.attendanceService.getAdminAllAttendance();
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any) {
    return this.attendanceService.updateStatus(Number(id), body.status, body.rejectionReason, body.isRequestTable);
  }

  @UseGuards(JwtAuthGuard)
  @Get('today')
  async getTodayAttendance(@Request() req) {
    return this.attendanceService.getTodayAttendance(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('check-in')
  async checkIn(@Request() req, @Body() body: any) {
    return this.attendanceService.submit(req.user.userId, 'IN', body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('break')
  async startBreak(@Request() req, @Body() body: any) {
    return this.attendanceService.submit(req.user.userId, 'BREAK', body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('end-break')
  async endBreak(@Request() req, @Body() body: any) {
    return this.attendanceService.submit(req.user.userId, 'END_BREAK', body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('check-out')
  async checkOut(@Request() req, @Body() body: any) {
    return this.attendanceService.submit(req.user.userId, 'OUT', body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('permit')
  async submitPermit(@Request() req, @Body() body: any) {
    return this.attendanceService.submit(req.user.userId, 'PERMIT', body);
  }

  @UseGuards(JwtAuthGuard)
  @Post('early-out')
  async submitEarlyOut(@Request() req, @Body() body: any) {
    return this.attendanceService.submit(req.user.userId, 'EARLY_OUT', body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAllAttendance(@Request() req) {
    return this.attendanceService.getAllAttendance(req.user.userId);
  }
}

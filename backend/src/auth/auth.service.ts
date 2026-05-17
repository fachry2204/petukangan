import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(username: string, pass: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && await bcrypt.compare(pass, user.password)) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = { username: user.username, sub: user.id, role: user.role.name };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        fullName: user.fullName,
        role: user.role, // Full role object
        photoUrl: user.photoUrl,
        phone: user.phone,
        zone: user.zone,
        gender: user.gender,
        birthDate: user.birthDate,
        address: user.address,
        province: user.province,
        city: user.city,
        district: user.district,
        village: user.village,
        postalCode: user.postalCode,
        status: user.status,
      },
    };
  }
}

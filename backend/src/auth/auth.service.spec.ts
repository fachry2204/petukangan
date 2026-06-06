import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;

  beforeEach(async () => {
    usersService = {
      findOne: jest.fn(),
    };
    jwtService = {
      sign: jest.fn().mockReturnValue('signed-token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('validateUser', () => {
    it('should return user without password when credentials are valid', async () => {
      const bcrypt = require('bcrypt');
      const hashed = await bcrypt.hash('password123', 10);

      const mockUser = {
        id: 1,
        username: 'admin',
        password: hashed,
        fullName: 'Admin User',
      };
      (usersService.findOne as jest.Mock).mockResolvedValue(mockUser);

      const result = await service.validateUser('admin', 'password123');
      expect(result).toEqual({
        id: 1,
        username: 'admin',
        fullName: 'Admin User',
      });
      expect(result).not.toHaveProperty('password');
    });

    it('should return null when user is not found', async () => {
      (usersService.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.validateUser('unknown', 'password');
      expect(result).toBeNull();
    });

    it('should return null when password does not match', async () => {
      const bcrypt = require('bcrypt');
      const hashed = await bcrypt.hash('correct-pass', 10);

      (usersService.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        username: 'admin',
        password: hashed,
      });

      const result = await service.validateUser('admin', 'wrong-pass');
      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access_token and user info', async () => {
      const mockUser = {
        id: 1,
        username: 'admin',
        fullName: 'Admin User',
        role: { id: 1, name: 'ADMIN' },
        photoUrl: null,
        phone: '6281234567890',
        zone: null,
        gender: 'male',
        birthDate: null,
        address: 'Jakarta',
        province: 'DKI Jakarta',
        city: 'Jakarta Selatan',
        district: 'Pesanggrahan',
        village: 'Petukangan',
        postalCode: '12270',
        status: 'active',
      };

      const result = await service.login(mockUser);

      expect(jwtService.sign).toHaveBeenCalledWith({
        username: 'admin',
        sub: 1,
        role: 'ADMIN',
      });
      expect(result.access_token).toBe('signed-token');
      expect(result.user.id).toBe(1);
      expect(result.user.username).toBe('admin');
      expect(result.user.fullName).toBe('Admin User');
      expect(result.user.role).toEqual({ id: 1, name: 'ADMIN' });
    });
  });
});

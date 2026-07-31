import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: Partial<AuthService>;

  beforeEach(async () => {
    authService = {
      validateUser: jest.fn(),
      login: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('login', () => {
    it('should return login result when credentials are valid', async () => {
      const user = { id: 1, username: 'admin', role: { name: 'ADMIN' } };
      const loginResult = { access_token: 'token', user };

      (authService.validateUser as jest.Mock).mockResolvedValue(user);
      (authService.login as jest.Mock).mockResolvedValue(loginResult);

      const result = await controller.login({ username: 'admin', password: 'pass' });
      expect(authService.validateUser).toHaveBeenCalledWith('admin', 'pass');
      expect(authService.login).toHaveBeenCalledWith(user);
      expect(result).toEqual(loginResult);
    });

    it('should throw UnauthorizedException when credentials are invalid', async () => {
      (authService.validateUser as jest.Mock).mockResolvedValue(null);

      await expect(
        controller.login({ username: 'admin', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('getProfile', () => {
    it('should return the user from the request', () => {
      const req = { user: { userId: 1, username: 'admin', role: 'ADMIN' } };
      expect(controller.getProfile(req)).toEqual(req.user);
    });
  });
});

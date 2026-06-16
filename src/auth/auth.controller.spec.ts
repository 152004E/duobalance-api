import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register', async () => {
      const dto: RegisterDto = { name: 'User', email: 'test@example.com', password: 'password123' };
      mockAuthService.register.mockResolvedValue({ id: 'uuid', name: 'User', email: 'test@example.com' });

      const result = await controller.register(dto);

      expect(result).toEqual({ id: 'uuid', name: 'User', email: 'test@example.com' });
      expect(service.register).toHaveBeenCalledWith(dto);
    });
  });

  describe('login', () => {
    it('should call authService.login and return token credentials', async () => {
      const dto: LoginDto = { email: 'test@example.com', password: 'password123' };
      const expectedResponse = {
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 900,
      };
      mockAuthService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(dto);

      expect(result).toEqual(expectedResponse);
      expect(service.login).toHaveBeenCalledWith(dto);
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh with plain refresh token', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'plain-refresh-token' };
      const expectedResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 900,
      };
      mockAuthService.refresh.mockResolvedValue(expectedResponse);

      const result = await controller.refresh(dto);

      expect(result).toEqual(expectedResponse);
      expect(service.refresh).toHaveBeenCalledWith('plain-refresh-token');
    });
  });

  describe('logout', () => {
    it('should call authService.logout with plain refresh token', async () => {
      const dto: RefreshTokenDto = { refreshToken: 'plain-refresh-token' };
      mockAuthService.logout.mockResolvedValue({ success: true });

      const result = await controller.logout(dto);

      expect(result).toEqual({ success: true });
      expect(service.logout).toHaveBeenCalledWith('plain-refresh-token');
    });
  });

  describe('profile', () => {
    it('should return req.user', () => {
      const mockReq = { user: { id: 'uuid', email: 'test@example.com' } };
      const result = controller.profile(mockReq);
      expect(result).toEqual(mockReq.user);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let refreshTokenService: RefreshTokenService;

  const mockUser = {
    id: 'user-uuid-123',
    name: 'Test User',
    email: 'test@example.com',
    password: 'hashedpassword',
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'nonexistent@example.com', password: 'password123' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' })
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should generate access and refresh tokens on successful login', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock-access-token');
      mockRefreshTokenService.createRefreshToken.mockResolvedValue('mock-refresh-token');

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 900,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { id: mockUser.id, email: mockUser.email },
        { expiresIn: '15m' }
      );
      expect(mockRefreshTokenService.createRefreshToken).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if refresh token is invalid, expired, or revoked', async () => {
      mockRefreshTokenService.validateRefreshToken.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(UnauthorizedException);
    });

    it('should generate a new access token, a new refresh token, and revoke the old one', async () => {
      const mockTokenRecord = {
        id: 'token-uuid',
        tokenHash: 'hashed-old-token',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 1000 * 60),
        user: mockUser,
      };

      mockRefreshTokenService.validateRefreshToken.mockResolvedValue(mockTokenRecord);
      mockJwtService.sign.mockReturnValue('new-access-token');
      mockRefreshTokenService.createRefreshToken.mockResolvedValue('new-refresh-token');
      mockRefreshTokenService.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await service.refresh('old-refresh-token');

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 900,
      });

      expect(mockRefreshTokenService.validateRefreshToken).toHaveBeenCalledWith('old-refresh-token');
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { id: mockUser.id, email: mockUser.email },
        { expiresIn: '15m' }
      );
      expect(mockRefreshTokenService.createRefreshToken).toHaveBeenCalledWith(mockUser.id);
      expect(mockRefreshTokenService.revokeRefreshToken).toHaveBeenCalledWith('old-refresh-token');
    });
  });

  describe('logout', () => {
    it('should call revokeRefreshToken and return success', async () => {
      mockRefreshTokenService.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout('refresh-token-to-revoke');

      expect(result).toEqual({ success: true });
      expect(mockRefreshTokenService.revokeRefreshToken).toHaveBeenCalledWith('refresh-token-to-revoke');
    });
  });
});

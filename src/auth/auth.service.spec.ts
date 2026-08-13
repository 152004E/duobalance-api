import { Test, TestingModule } from '@nestjs/testing';
import {
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';
import { EmailVerificationService } from './email-verification.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcrypt';

jest.mock('bcrypt');

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let refreshTokenService: RefreshTokenService;
  let emailVerificationService: EmailVerificationService;
  let mailService: MailService;

  const mockUser = {
    id: 'user-uuid-123',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    password: 'hashedpassword',
    emailVerifiedAt: null,
    avatarUrl: null,
    createdAt: new Date(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    create: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockRefreshTokenService = {
    createRefreshToken: jest.fn(),
    validateRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
  };

  const mockEmailVerificationService = {
    createVerificationToken: jest.fn(),
    validateVerificationToken: jest.fn(),
    markUsed: jest.fn(),
    invalidateForUser: jest.fn(),
  };

  const mockMailService = {
    sendWelcomeAndVerification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RefreshTokenService, useValue: mockRefreshTokenService },
        {
          provide: EmailVerificationService,
          useValue: mockEmailVerificationService,
        },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    refreshTokenService = module.get<RefreshTokenService>(RefreshTokenService);
    emailVerificationService = module.get<EmailVerificationService>(
      EmailVerificationService,
    );
    mailService = module.get<MailService>(MailService);

    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedpassword');
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);

      await expect(
        service.register({
          firstName: 'Test',
          lastName: 'User',
          email: 'test@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should create the user, send the verification email and return the user without password', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockEmailVerificationService.createVerificationToken.mockResolvedValue(
        'plain-token',
      );
      mockMailService.sendWelcomeAndVerification.mockResolvedValue({ id: '1' });

      const result = await service.register({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(usersService.create).toHaveBeenCalledWith({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'hashedpassword',
      });
      expect(
        emailVerificationService.createVerificationToken,
      ).toHaveBeenCalledWith(mockUser.id);
      expect(mailService.sendWelcomeAndVerification).toHaveBeenCalledWith(
        mockUser.email,
        'Test User',
        'plain-token',
      );
      expect(result).not.toHaveProperty('password');
    });

    it('should not throw when the mail fails to send', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockEmailVerificationService.createVerificationToken.mockRejectedValue(
        new Error('resend down'),
      );

      const result = await service.register({
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).not.toHaveProperty('password');
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException if user is not found', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: 'nonexistent@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw ForbiddenException if the email is not verified', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(
        service.login({ email: 'test@example.com', password: 'password123' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should generate access and refresh tokens on successful verified login', async () => {
      mockUsersService.findByEmail.mockResolvedValue({
        ...mockUser,
        emailVerifiedAt: new Date(),
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockJwtService.sign.mockReturnValue('mock-access-token');
      mockRefreshTokenService.createRefreshToken.mockResolvedValue(
        'mock-refresh-token',
      );

      const result = await service.login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result).toEqual({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        expires_in: 120,
      });
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { id: mockUser.id, email: mockUser.email },
        { expiresIn: '2m' },
      );
      expect(mockRefreshTokenService.createRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
      );
    });
  });

  describe('verifyEmail', () => {
    it('should throw UnauthorizedException if the token is invalid or expired', async () => {
      mockEmailVerificationService.validateVerificationToken.mockResolvedValue(
        null,
      );

      await expect(service.verifyEmail('bad-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should mark the token as used and set emailVerifiedAt', async () => {
      mockEmailVerificationService.validateVerificationToken.mockResolvedValue({
        id: 'token-id',
        userId: mockUser.id,
      });
      mockUsersService.update.mockResolvedValue(mockUser);

      const result = await service.verifyEmail('valid-token');

      expect(emailVerificationService.markUsed).toHaveBeenCalledWith(
        'token-id',
      );
      expect(emailVerificationService.invalidateForUser).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(usersService.update).toHaveBeenCalledWith(mockUser.id, {
        emailVerifiedAt: expect.any(Date),
      });
      expect(result).not.toHaveProperty('password');
    });
  });

  describe('resendVerification', () => {
    it('should generate a new token and resend when the user exists and is unverified', async () => {
      mockUsersService.findByEmail.mockResolvedValue(mockUser);
      mockEmailVerificationService.createVerificationToken.mockResolvedValue(
        'new-token',
      );

      await service.resendVerification('test@example.com');

      expect(emailVerificationService.invalidateForUser).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(
        emailVerificationService.createVerificationToken,
      ).toHaveBeenCalledWith(mockUser.id);
      expect(mailService.sendWelcomeAndVerification).toHaveBeenCalledWith(
        mockUser.email,
        'Test User',
        'new-token',
      );
    });

    it('should not send anything when the user does not exist', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await service.resendVerification('ghost@example.com');

      expect(mailService.sendWelcomeAndVerification).not.toHaveBeenCalled();
    });
  });

  describe('refresh', () => {
    it('should throw UnauthorizedException if refresh token is invalid, expired, or revoked', async () => {
      mockRefreshTokenService.validateRefreshToken.mockResolvedValue(null);

      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should generate a new access token, a new refresh token, and revoke the old one', async () => {
      const mockTokenRecord = {
        id: 'token-uuid',
        tokenHash: 'hashed-old-token',
        userId: mockUser.id,
        expiresAt: new Date(Date.now() + 1000 * 60),
        user: mockUser,
      };

      mockRefreshTokenService.validateRefreshToken.mockResolvedValue(
        mockTokenRecord,
      );
      mockJwtService.sign.mockReturnValue('new-access-token');
      mockRefreshTokenService.createRefreshToken.mockResolvedValue(
        'new-refresh-token',
      );
      mockRefreshTokenService.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await service.refresh('old-refresh-token');

      expect(result).toEqual({
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        expires_in: 120,
      });

      expect(mockRefreshTokenService.validateRefreshToken).toHaveBeenCalledWith(
        'old-refresh-token',
      );
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        { id: mockUser.id, email: mockUser.email },
        { expiresIn: '2m' },
      );
      expect(mockRefreshTokenService.createRefreshToken).toHaveBeenCalledWith(
        mockUser.id,
      );
      expect(mockRefreshTokenService.revokeRefreshToken).toHaveBeenCalledWith(
        'old-refresh-token',
      );
    });
  });

  describe('logout', () => {
    it('should call revokeRefreshToken and return success', async () => {
      mockRefreshTokenService.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await service.logout('refresh-token-to-revoke');

      expect(result).toEqual({ success: true });
      expect(mockRefreshTokenService.revokeRefreshToken).toHaveBeenCalledWith(
        'refresh-token-to-revoke',
      );
    });
  });
});
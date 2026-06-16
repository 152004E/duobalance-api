import { Test, TestingModule } from '@nestjs/testing';
import { RefreshTokenService } from './refresh-token.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  let prisma: PrismaService;

  const mockPrismaService = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<RefreshTokenService>(RefreshTokenService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashToken', () => {
    it('should return a SHA-256 hash of the input string', () => {
      const token = 'my-plain-text-token';
      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);

      expect(hash1).toHaveLength(64); // SHA-256 hex length is 64
      expect(hash1).toEqual(hash2);
      expect(hash1).not.toEqual(token);
    });
  });

  describe('createRefreshToken', () => {
    it('should generate a cryptographically secure token, hash it, and save it in the database', async () => {
      mockPrismaService.refreshToken.create.mockResolvedValue({
        id: 'token-uuid',
        tokenHash: 'some-hash',
        userId: 'user-uuid',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const plainToken = await service.createRefreshToken('user-uuid');

      expect(plainToken).toBeDefined();
      expect(plainToken).toHaveLength(64); // 32 bytes to hex = 64 characters
      expect(mockPrismaService.refreshToken.create).toHaveBeenCalled();
      
      const callArgs = mockPrismaService.refreshToken.create.mock.calls[0][0];
      expect(callArgs.data.userId).toEqual('user-uuid');
      expect(callArgs.data.tokenHash).toEqual(service.hashToken(plainToken));
      expect(callArgs.data.expiresAt).toBeInstanceOf(Date);
    });
  });

  describe('validateRefreshToken', () => {
    it('should return null if token is not found in database', async () => {
      mockPrismaService.refreshToken.findUnique.mockResolvedValue(null);

      const result = await service.validateRefreshToken('nonexistent-token');

      expect(result).toBeNull();
      expect(mockPrismaService.refreshToken.findUnique).toHaveBeenCalled();
    });

    it('should revoke the token and return null if token is expired', async () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 1); // 1 hour ago

      const mockRecord = {
        id: 'token-uuid',
        tokenHash: 'some-hash',
        userId: 'user-uuid',
        expiresAt: expiredDate,
        user: { id: 'user-uuid', email: 'test@example.com' },
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockRecord);
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      const result = await service.validateRefreshToken('expired-token');

      expect(result).toBeNull();
      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalled();
    });

    it('should return the token record if valid and not expired', async () => {
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 1); // 1 hour from now

      const mockRecord = {
        id: 'token-uuid',
        tokenHash: 'some-hash',
        userId: 'user-uuid',
        expiresAt: futureDate,
        user: { id: 'user-uuid', email: 'test@example.com' },
      };

      mockPrismaService.refreshToken.findUnique.mockResolvedValue(mockRecord);

      const result = await service.validateRefreshToken('valid-token');

      expect(result).toEqual(mockRecord);
      expect(mockPrismaService.refreshToken.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('revokeRefreshToken', () => {
    it('should delete token matching hash from database', async () => {
      mockPrismaService.refreshToken.deleteMany.mockResolvedValue({ count: 1 });

      await service.revokeRefreshToken('token-to-delete');

      expect(mockPrismaService.refreshToken.deleteMany).toHaveBeenCalled();
      const callArgs = mockPrismaService.refreshToken.deleteMany.mock.calls[0][0];
      expect(callArgs.where.tokenHash).toEqual(service.hashToken('token-to-delete'));
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PasswordResetService } from './password-reset.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PasswordResetService', () => {
  let service: PasswordResetService;
  let prisma: PrismaService;

  const mockPrismaService = {
    passwordResetToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PasswordResetService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PasswordResetService>(PasswordResetService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('hashToken', () => {
    it('should return a SHA-256 hash of the input string', () => {
      const token = 'plain-reset-token';
      const hash1 = service.hashToken(token);
      const hash2 = service.hashToken(token);

      expect(hash1).toHaveLength(64);
      expect(hash1).toEqual(hash2);
      expect(hash1).not.toEqual(token);
    });
  });

  describe('createResetToken', () => {
    it('should generate a 64-char plain token, store it hashed with a 60min expiry', async () => {
      mockPrismaService.passwordResetToken.create.mockResolvedValue({
        id: 'reset-uuid',
        tokenHash: 'hash',
        userId: 'user-uuid',
        expiresAt: new Date(),
        createdAt: new Date(),
      });

      const plainToken = await service.createResetToken('user-uuid');

      expect(plainToken).toHaveLength(64);

      const data = mockPrismaService.passwordResetToken.create.mock.calls[0][0]
        .data as {
        tokenHash: string;
        userId: string;
        expiresAt: Date;
      };
      expect(data.userId).toBe('user-uuid');
      expect(data.tokenHash).toBe(service.hashToken(plainToken));
      const ttlMs = data.expiresAt.getTime() - Date.now();
      expect(ttlMs).toBeGreaterThan(59 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000);
    });
  });

  describe('validateResetToken', () => {
    it('should return null when the token does not exist', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(null);

      await expect(service.validateResetToken('unknown')).resolves.toBeNull();
    });

    it('should return null when the token is already used', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'reset-id',
        usedAt: new Date(),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });

      await expect(
        service.validateResetToken('used-token'),
      ).resolves.toBeNull();
    });

    it('should return null when the token is expired', async () => {
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue({
        id: 'reset-id',
        usedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(
        service.validateResetToken('expired-token'),
      ).resolves.toBeNull();
    });

    it('should return the record with the user when the token is valid', async () => {
      const record = {
        id: 'reset-id',
        usedAt: null,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        user: { id: 'user-uuid' },
      };
      mockPrismaService.passwordResetToken.findUnique.mockResolvedValue(record);

      await expect(service.validateResetToken('valid-token')).resolves.toEqual(
        record,
      );
    });
  });

  describe('markUsed', () => {
    it('should set usedAt on the token', async () => {
      mockPrismaService.passwordResetToken.update.mockResolvedValue({});

      await service.markUsed('reset-id');

      expect(mockPrismaService.passwordResetToken.update).toHaveBeenCalledWith({
        where: { id: 'reset-id' },
        data: { usedAt: expect.any(Date) },
      });
    });
  });

  describe('invalidateForUser', () => {
    it('should delete pending tokens of a user', async () => {
      mockPrismaService.passwordResetToken.deleteMany.mockResolvedValue({
        count: 2,
      });

      await service.invalidateForUser('user-uuid');

      expect(
        mockPrismaService.passwordResetToken.deleteMany,
      ).toHaveBeenCalledWith({
        where: { userId: 'user-uuid', usedAt: null },
      });
    });
  });
});

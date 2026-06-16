import { Test, TestingModule } from '@nestjs/testing';
import { CouplesService } from './couples.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CouplesService', () => {
  let service: CouplesService;

  const mockUser = { id: 'user-1', name: 'Juan', email: 'juan@test.com', coupleId: null };
  const mockUserInCouple = { ...mockUser, coupleId: 'couple-1' };
  const mockCouple = {
    id: 'couple-1',
    inviteCode: 'ABCD1234',
    users: [mockUser],
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    couple: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouplesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CouplesService>(CouplesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // createCouple
  // ──────────────────────────────────────────────
  describe('createCouple', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.createCouple('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user already belongs to a couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserInCouple);

      await expect(service.createCouple('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should create and return a new couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.couple.create.mockResolvedValue(mockCouple);

      const result = await service.createCouple('user-1');

      expect(result).toEqual(mockCouple);
      expect(mockPrismaService.couple.create).toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────────────
  // joinCouple
  // ──────────────────────────────────────────────
  describe('joinCouple', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.joinCouple('nonexistent', 'CODE')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user already belongs to a couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserInCouple);

      await expect(service.joinCouple('user-1', 'CODE')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if invite code is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.couple.findUnique.mockResolvedValue(null);

      await expect(service.joinCouple('user-1', 'INVALID')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if couple already has two members', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.couple.findUnique.mockResolvedValue({
        ...mockCouple,
        users: [{ id: 'user-2' }, { id: 'user-3' }],
      });

      await expect(service.joinCouple('user-1', 'ABCD1234')).rejects.toThrow(BadRequestException);
    });

    it('should join the couple and return updated couple data', async () => {
      const updatedCouple = { ...mockCouple, users: [mockUser, { id: 'user-2' }] };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.couple.findUnique
        .mockResolvedValueOnce({ ...mockCouple, users: [{ id: 'user-2' }] })
        .mockResolvedValueOnce(updatedCouple);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.joinCouple('user-1', 'ABCD1234');

      expect(result).toEqual(updatedCouple);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { coupleId: mockCouple.id },
      });
    });
  });

  // ──────────────────────────────────────────────
  // getMyCouple
  // ──────────────────────────────────────────────
  describe('getMyCouple', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getMyCouple('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user has no couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ coupleId: null });

      await expect(service.getMyCouple('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should return the couple data', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({ coupleId: 'couple-1' });
      mockPrismaService.couple.findUnique.mockResolvedValue(mockCouple);

      const result = await service.getMyCouple('user-1');

      expect(result).toEqual(mockCouple);
    });
  });

  // ──────────────────────────────────────────────
  // leaveCouple
  // ──────────────────────────────────────────────
  describe('leaveCouple', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.leaveCouple('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user has no couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.leaveCouple('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should return "Left couple successfully" if partner remains', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserInCouple);
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.couple.findUnique.mockResolvedValue({
        ...mockCouple,
        users: [{ id: 'user-2' }], // one user still in couple
      });

      const result = await service.leaveCouple('user-1');

      expect(result).toEqual({ message: 'Left couple successfully' });
      expect(mockPrismaService.couple.delete).not.toHaveBeenCalled();
    });

    it('should delete the couple and return "Couple deleted" when last member leaves', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserInCouple);
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.couple.findUnique.mockResolvedValue({
        ...mockCouple,
        users: [], // empty after update
      });
      mockPrismaService.couple.delete.mockResolvedValue({});

      const result = await service.leaveCouple('user-1');

      expect(result).toEqual({ message: 'Couple deleted' });
      expect(mockPrismaService.couple.delete).toHaveBeenCalledWith({
        where: { id: mockCouple.id },
      });
    });
  });
});

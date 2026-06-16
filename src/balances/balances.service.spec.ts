import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BalancesService', () => {
  let service: BalancesService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BalancesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<BalancesService>(BalancesService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('calculate', () => {
    const userId = 'user-1';

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.calculate(userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
    });

    it('should throw BadRequestException when user has no couple', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId: null,
      });

      await expect(service.calculate(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return SETTLED when there are no expenses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId: 'couple-1',
      });
      mockPrisma.expense.findMany.mockResolvedValue([]);

      const result = await service.calculate(userId);

      expect(result).toEqual({
        totalExpenses: 0,
        totalPaidByMe: 0,
        totalPaidByPartner: 0,
        myShare: 0,
        partnerShare: 0,
        balance: 0,
        direction: 'SETTLED',
      });
    });

    it('should calculate correct balance when user paid more', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId: 'couple-1',
      });
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 200 },
        { paidById: 'partner-1', amount: 100 },
      ]);

      const result = await service.calculate(userId);

      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith({
        where: {
          coupleId: 'couple-1',
          deletedAt: null,
          splitType: 'EQUAL',
        },
      });
      expect(result).toEqual({
        totalExpenses: 300,
        totalPaidByMe: 200,
        totalPaidByPartner: 100,
        myShare: 150,
        partnerShare: 150,
        balance: 50,
        direction: 'OWED_TO_ME',
      });
    });

    it('should calculate correct balance when user paid less', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId: 'couple-1',
      });
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 100 },
        { paidById: 'partner-1', amount: 200 },
      ]);

      const result = await service.calculate(userId);

      expect(result).toEqual({
        totalExpenses: 300,
        totalPaidByMe: 100,
        totalPaidByPartner: 200,
        myShare: 150,
        partnerShare: 150,
        balance: 50,
        direction: 'I_OWE',
      });
    });

    it('should return SETTLED when both paid equally', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId: 'couple-1',
      });
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 150 },
        { paidById: 'partner-1', amount: 150 },
      ]);

      const result = await service.calculate(userId);

      expect(result).toEqual({
        totalExpenses: 300,
        totalPaidByMe: 150,
        totalPaidByPartner: 150,
        myShare: 150,
        partnerShare: 150,
        balance: 0,
        direction: 'SETTLED',
      });
    });

    it('should only consider EQUAL splitType expenses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId: 'couple-1',
      });
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 200 },
      ]);

      const result = await service.calculate(userId);

      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            splitType: 'EQUAL',
          }),
        }),
      );
      expect(result.totalExpenses).toBe(200);
    });

    it('should only consider non-deleted expenses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId: 'couple-1',
      });
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 200 },
      ]);

      const result = await service.calculate(userId);

      expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
          }),
        }),
      );
      expect(result.totalExpenses).toBe(200);
    });
  });
});

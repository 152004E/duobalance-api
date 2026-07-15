import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { PrismaService } from '../prisma/prisma.service';

describe('BalancesService', () => {
  let service: BalancesService;

  const userId = 'user-1';
  const groupId = 'group-1';

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    groupMember: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
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
    jest.clearAllMocks();
  });

  describe('calculate', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.calculate(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user has no group', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      await expect(service.calculate(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return SETTLED when there are no expenses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.groupMember.findFirst.mockResolvedValue({ userId, groupId, role: 'OWNER' });
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

    it('should calculate correct EQUAL balance when user paid more', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.groupMember.findFirst.mockResolvedValue({ userId, groupId, role: 'OWNER' });
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 200, splitType: 'EQUAL', splits: [] },
        { paidById: 'partner-1', amount: 100, splitType: 'EQUAL', splits: [] },
      ]);

      const result = await service.calculate(userId);

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

    it('should calculate correct EQUAL balance when user paid less', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.groupMember.findFirst.mockResolvedValue({ userId, groupId, role: 'OWNER' });
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 100, splitType: 'EQUAL', splits: [] },
        { paidById: 'partner-1', amount: 200, splitType: 'EQUAL', splits: [] },
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

    it('should return SETTLED when both paid equally EQUAL', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.groupMember.findFirst.mockResolvedValue({ userId, groupId, role: 'OWNER' });
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 150, splitType: 'EQUAL', splits: [] },
        { paidById: 'partner-1', amount: 150, splitType: 'EQUAL', splits: [] },
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

    it('should calculate PERCENTAGE balance correctly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.groupMember.findFirst.mockResolvedValue({ userId, groupId, role: 'OWNER' });
      mockPrisma.expense.findMany.mockResolvedValue([
        {
          paidById: userId,
          amount: 100,
          splitType: 'PERCENTAGE',
          splits: [
            { userId, percentage: 70 },
            { userId: 'partner-1', percentage: 30 },
          ],
        },
      ]);

      const result = await service.calculate(userId);

      expect(result.totalExpenses).toBe(100);
      expect(result.totalPaidByMe).toBe(100);
      expect(result.totalPaidByPartner).toBe(0);
      expect(result.myShare).toBe(70);
      expect(result.partnerShare).toBe(30);
      expect(result.balance).toBe(30);
      expect(result.direction).toBe('OWED_TO_ME');
    });

    it('should handle mixed EQUAL + PERCENTAGE expenses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.groupMember.findFirst.mockResolvedValue({ userId, groupId, role: 'OWNER' });
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 100, splitType: 'EQUAL', splits: [] },
        {
          paidById: 'partner-1',
          amount: 200,
          splitType: 'PERCENTAGE',
          splits: [
            { userId, percentage: 70 },
            { userId: 'partner-1', percentage: 30 },
          ],
        },
      ]);

      const result = await service.calculate(userId);

      expect(result.totalExpenses).toBe(300);
      expect(result.totalPaidByMe).toBe(100);
      expect(result.totalPaidByPartner).toBe(200);
      expect(result.myShare).toBe(190);
      expect(result.partnerShare).toBe(110);
      expect(result.balance).toBe(90);
      expect(result.direction).toBe('I_OWE');
    });

    it('should only consider non-deleted expenses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: userId });
      mockPrisma.groupMember.findFirst.mockResolvedValue({ userId, groupId, role: 'OWNER' });
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 200, splitType: 'EQUAL', splits: [] },
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

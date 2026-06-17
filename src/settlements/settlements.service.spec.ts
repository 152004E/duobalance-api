import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SettlementsService', () => {
  let service: SettlementsService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    couple: {
      findUnique: jest.fn(),
    },
    expense: {
      findMany: jest.fn(),
    },
    payment: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<SettlementsService>(SettlementsService);
    prisma = module.get<PrismaService>(PrismaService);
    jest.clearAllMocks();
  });

  describe('calculate', () => {
    const userId = 'user-1';
    const partnerId = 'partner-1';

    const baseUser = { id: userId, coupleId: 'couple-1' };
    const baseCouple = {
      id: 'couple-1',
      users: [
        { id: userId, firstName: 'Juan', lastName: 'Perez' },
        { id: partnerId, firstName: 'Maria', lastName: 'Lopez' },
      ],
    };

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

    it('should return all zeros and SETTLED when no expenses or payments', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.couple.findUnique.mockResolvedValue(baseCouple);
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.calculate(userId);

      expect(result).toEqual({
        totalExpenses: 0,
        totalPaidByMe: 0,
        totalPaidByPartner: 0,
        myShare: 0,
        partnerShare: 0,
        balanceAmount: 0,
        balanceDirection: 'SETTLED',
        paymentsMade: 0,
        paymentsReceived: 0,
        netSettlement: 0,
        settlementDirection: 'SETTLED',
      });
    });

    it('should calculate EQUAL settlement with balance and partial payment', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.couple.findUnique.mockResolvedValue(baseCouple);
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 200, splitType: 'EQUAL', splits: [] },
        { paidById: partnerId, amount: 100, splitType: 'EQUAL', splits: [] },
      ]);
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: 30,
          fromUserId: partnerId,
          toUserId: userId,
          coupleId: 'couple-1',
        },
      ]);

      const result = await service.calculate(userId);

      expect(result).toEqual({
        totalExpenses: 300,
        totalPaidByMe: 200,
        totalPaidByPartner: 100,
        myShare: 150,
        partnerShare: 150,
        balanceAmount: 50,
        balanceDirection: 'OWED_TO_ME',
        paymentsMade: 0,
        paymentsReceived: 30,
        netSettlement: 20,
        settlementDirection: 'OWED_TO_ME',
      });
    });

    it('should return SETTLED when payment exactly matches balance (EQUAL)', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.couple.findUnique.mockResolvedValue(baseCouple);
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 200, splitType: 'EQUAL', splits: [] },
        { paidById: partnerId, amount: 100, splitType: 'EQUAL', splits: [] },
      ]);
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: 50,
          fromUserId: partnerId,
          toUserId: userId,
          coupleId: 'couple-1',
        },
      ]);

      const result = await service.calculate(userId);

      expect(result.netSettlement).toBe(0);
      expect(result.settlementDirection).toBe('SETTLED');
    });

    it('should return I_OWE when payment exceeds balance', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.couple.findUnique.mockResolvedValue(baseCouple);
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 200, splitType: 'EQUAL', splits: [] },
        { paidById: partnerId, amount: 100, splitType: 'EQUAL', splits: [] },
      ]);
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: 70,
          fromUserId: partnerId,
          toUserId: userId,
          coupleId: 'couple-1',
        },
      ]);

      const result = await service.calculate(userId);

      expect(result.netSettlement).toBe(20);
      expect(result.settlementDirection).toBe('I_OWE');
    });

    it('should handle PERCENTAGE splits in settlement', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.couple.findUnique.mockResolvedValue(baseCouple);
      mockPrisma.expense.findMany.mockResolvedValue([
        {
          paidById: userId,
          amount: 100,
          splitType: 'PERCENTAGE',
          splits: [
            { userId: userId, percentage: 70 },
            { userId: partnerId, percentage: 30 },
          ],
        },
      ]);
      mockPrisma.payment.findMany.mockResolvedValue([
        {
          id: 'pay-1',
          amount: 10,
          fromUserId: partnerId,
          toUserId: userId,
          coupleId: 'couple-1',
        },
      ]);

      const result = await service.calculate(userId);

      // User paid 100, should pay 70 → balanceAmount=30 OWED_TO_ME
      // Partner paid 10 → netSettlement = 30 - 10 = 20
      expect(result.balanceAmount).toBe(30);
      expect(result.balanceDirection).toBe('OWED_TO_ME');
      expect(result.paymentsReceived).toBe(10);
      expect(result.netSettlement).toBe(20);
      expect(result.settlementDirection).toBe('OWED_TO_ME');
    });
  });
});

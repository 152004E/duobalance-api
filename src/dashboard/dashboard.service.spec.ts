import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';
import { BalancesService } from '../balances/balances.service';
import { SettlementsService } from '../settlements/settlements.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrisma = {
    user: { findUnique: jest.fn() },
    expense: { findMany: jest.fn() },
    payment: { findMany: jest.fn() },
  };

  const mockBalancesService = {
    calculate: jest.fn(),
  };

  const mockSettlementsService = {
    calculate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BalancesService, useValue: mockBalancesService },
        { provide: SettlementsService, useValue: mockSettlementsService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    const userId = 'user-1';
    const coupleId = 'couple-1';

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getSummary(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user has no couple', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId: null,
      });

      await expect(service.getSummary(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty dashboard when no data exists', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId,
      });
      mockBalancesService.calculate.mockResolvedValue({
        balance: 0,
        direction: 'SETTLED',
      });
      mockSettlementsService.calculate.mockResolvedValue({
        netSettlement: 0,
        settlementDirection: 'SETTLED',
      });
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getSummary(userId);

      expect(result).toEqual({
        balance: { amount: 0, direction: 'SETTLED' },
        settlement: { amount: 0, direction: 'SETTLED' },
        monthExpenses: 0,
        expenseCount: 0,
        monthPayments: 0,
        topCategory: null,
        expensesByCategory: [],
        lastExpense: null,
        monthlyComparison: {
          currentMonth: 0,
          previousMonth: 0,
          difference: 0,
          percentageChange: null,
        },
      });

      expect(mockPrisma.expense.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.payment.findMany).toHaveBeenCalledTimes(1);
    });

    it('should return dashboard with expenses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId,
      });
      mockBalancesService.calculate.mockResolvedValue({
        balance: 50,
        direction: 'OWED_TO_ME',
      });
      mockSettlementsService.calculate.mockResolvedValue({
        netSettlement: 20,
        settlementDirection: 'OWED_TO_ME',
      });

      const fakeExpenses = [
        {
          id: 'exp-1',
          description: 'Cena',
          amount: 200,
          category: 'FOOD',
          createdAt: new Date(),
          splitType: 'EQUAL',
        },
        {
          id: 'exp-2',
          description: 'Taxi',
          amount: 100,
          category: 'TRANSPORT',
          createdAt: new Date(),
          splitType: 'EQUAL',
        },
      ];

      mockPrisma.expense.findMany
        .mockResolvedValueOnce(fakeExpenses)
        .mockResolvedValueOnce([]);

      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getSummary(userId);

      expect(result.monthExpenses).toBe(300);
      expect(result.expenseCount).toBe(2);
      expect(result.balance).toEqual({ amount: 50, direction: 'OWED_TO_ME' });
      expect(result.settlement).toEqual({ amount: 20, direction: 'OWED_TO_ME' });
      expect(result.topCategory).toEqual({ name: 'FOOD', amount: 200 });
      expect(result.expensesByCategory).toHaveLength(2);
      expect(result.lastExpense).toBeTruthy();
    });

    it('should return dashboard with payments', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId,
      });
      mockBalancesService.calculate.mockResolvedValue({
        balance: 0,
        direction: 'SETTLED',
      });
      mockSettlementsService.calculate.mockResolvedValue({
        netSettlement: 0,
        settlementDirection: 'SETTLED',
      });
      mockPrisma.expense.findMany.mockResolvedValue([]);
      mockPrisma.payment.findMany.mockResolvedValue([
        { amount: 150 },
        { amount: 50 },
      ]);

      const result = await service.getSummary(userId);

      expect(result.monthPayments).toBe(200);
    });

    it('should calculate monthly comparison', async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      const endOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth(),
        0,
        23,
        59,
        59,
        999,
      );

      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId,
      });
      mockBalancesService.calculate.mockResolvedValue({
        balance: 0,
        direction: 'SETTLED',
      });
      mockSettlementsService.calculate.mockResolvedValue({
        netSettlement: 0,
        settlementDirection: 'SETTLED',
      });

      mockPrisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 300, category: 'FOOD', id: 'e1', description: 'X', createdAt: new Date(), splitType: 'EQUAL' },
        ])
        .mockResolvedValueOnce([
          { amount: 200, category: 'FOOD', id: 'e2', description: 'Y', createdAt: new Date(startOfLastMonth), splitType: 'EQUAL' },
        ]);

      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getSummary(userId);

      expect(result.monthlyComparison).toEqual({
        currentMonth: 300,
        previousMonth: 200,
        difference: 100,
        percentageChange: 50,
      });
    });

    it('should set percentageChange to null when previous month is 0', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: userId,
        coupleId,
      });
      mockBalancesService.calculate.mockResolvedValue({
        balance: 0,
        direction: 'SETTLED',
      });
      mockSettlementsService.calculate.mockResolvedValue({
        netSettlement: 0,
        settlementDirection: 'SETTLED',
      });
      mockPrisma.expense.findMany
        .mockResolvedValueOnce([
          { amount: 300, category: 'FOOD', id: 'e1', description: 'X', createdAt: new Date(), splitType: 'EQUAL' },
        ])
        .mockResolvedValueOnce([]);
      mockPrisma.payment.findMany.mockResolvedValue([]);

      const result = await service.getSummary(userId);

      expect(result.monthlyComparison.percentageChange).toBeNull();
    });
  });
});

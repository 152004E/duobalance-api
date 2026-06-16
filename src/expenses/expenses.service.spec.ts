import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesService } from './expenses.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ExpenseCategory, SplitType } from '../generated/enums';

describe('ExpensesService', () => {
  let service: ExpensesService;
  let prisma: PrismaService;

  const mockUser = {
    id: 'user-uuid-1',
    name: 'Juan',
    email: 'juan@example.com',
    coupleId: 'couple-uuid-1',
  };

  const mockUserWithoutCouple = {
    id: 'user-uuid-2',
    name: 'Solo',
    email: 'solo@example.com',
    coupleId: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    expense: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExpensesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ExpensesService>(ExpensesService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent-id', {
          description: 'Cena',
          amount: 100,
          category: ExpenseCategory.FOOD,
          splitType: SplitType.EQUAL,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user has no couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithoutCouple);

      await expect(
        service.create(mockUserWithoutCouple.id, {
          description: 'Cena',
          amount: 100,
          category: ExpenseCategory.FOOD,
          splitType: SplitType.EQUAL,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if splitType is PERCENTAGE but splits are missing or not exactly 2', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create(mockUser.id, {
          description: 'Cena',
          amount: 100,
          category: ExpenseCategory.FOOD,
          splitType: SplitType.PERCENTAGE,
          splits: [],
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.create(mockUser.id, {
          description: 'Cena',
          amount: 100,
          category: ExpenseCategory.FOOD,
          splitType: SplitType.PERCENTAGE,
          splits: [{ userId: 'user-uuid-1', percentage: 100 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if splitType is PERCENTAGE and splits do not sum to 100', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create(mockUser.id, {
          description: 'Cena',
          amount: 100,
          category: ExpenseCategory.FOOD,
          splitType: SplitType.PERCENTAGE,
          splits: [
            { userId: 'user-uuid-1', percentage: 60 },
            { userId: 'user-uuid-2', percentage: 30 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should successfully create an EQUAL split expense', async () => {
      const dto = {
        description: 'Cena',
        amount: 100,
        category: ExpenseCategory.FOOD,
        splitType: SplitType.EQUAL,
      };

      const createdExpense = {
        id: 'expense-uuid-1',
        description: dto.description,
        amount: dto.amount,
        category: dto.category,
        splitType: dto.splitType,
        paidById: mockUser.id,
        coupleId: mockUser.coupleId,
        splits: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expense.create.mockResolvedValue(createdExpense);
      mockPrismaService.expense.findUnique.mockResolvedValue(createdExpense);

      const result = await service.create(mockUser.id, dto);

      expect(result).toEqual(createdExpense);
      expect(mockPrismaService.expense.create).toHaveBeenCalledWith({
        data: {
          description: dto.description,
          amount: dto.amount,
          category: dto.category,
          splitType: dto.splitType,
          paidById: mockUser.id,
          coupleId: mockUser.coupleId,
        },
      });
    });

    it('should successfully create a PERCENTAGE split expense', async () => {
      const dto = {
        description: 'Cena',
        amount: 100,
        category: ExpenseCategory.FOOD,
        splitType: SplitType.PERCENTAGE,
        splits: [
          { userId: 'user-uuid-1', percentage: 70 },
          { userId: 'user-uuid-2', percentage: 30 },
        ],
      };

      const createdExpense = {
        id: 'expense-uuid-2',
        description: dto.description,
        amount: dto.amount,
        category: dto.category,
        splitType: dto.splitType,
        paidById: mockUser.id,
        coupleId: mockUser.coupleId,
        splits: dto.splits.map(s => ({ ...s, id: 'split-id' })),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expense.create.mockResolvedValue(createdExpense);
      mockPrismaService.expense.findUnique.mockResolvedValue(createdExpense);

      const result = await service.create(mockUser.id, dto);

      expect(result).toEqual(createdExpense);
      expect(mockPrismaService.expense.create).toHaveBeenCalledWith({
        data: {
          description: dto.description,
          amount: dto.amount,
          category: dto.category,
          splitType: dto.splitType,
          paidById: mockUser.id,
          coupleId: mockUser.coupleId,
          splits: {
            create: dto.splits.map(s => ({
              percentage: s.percentage,
              userId: s.userId,
            })),
          },
        },
      });
    });
  });

  describe('findAll', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findAll('nonexistent-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not in a couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithoutCouple);

      await expect(service.findAll(mockUserWithoutCouple.id)).rejects.toThrow(BadRequestException);
    });

    it('should retrieve couple expenses and filter by query params', async () => {
      const query = {
        category: ExpenseCategory.FOOD,
        splitType: SplitType.EQUAL,
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        minAmount: 10,
        maxAmount: 500,
      };

      const mockExpenses = [
        {
          id: 'exp-1',
          description: 'Cena',
          amount: 120,
          category: ExpenseCategory.FOOD,
          splitType: SplitType.EQUAL,
          coupleId: mockUser.coupleId,
          deletedAt: null,
          splits: [],
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expense.findMany.mockResolvedValue(mockExpenses);

      const result = await service.findAll(mockUser.id, query);

      expect(result).toEqual(mockExpenses);
      expect(mockPrismaService.expense.findMany).toHaveBeenCalledWith({
        where: {
          coupleId: mockUser.coupleId,
          deletedAt: null,
          category: query.category,
          splitType: query.splitType,
          AND: [
            { createdAt: { gte: new Date(query.startDate) } },
            { createdAt: { lte: new Date(query.endDate) } },
            { amount: { gte: query.minAmount } },
            { amount: { lte: query.maxAmount } },
          ],
        },
        include: { splits: true },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent-id', 'exp-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not in a couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithoutCouple);

      await expect(service.findOne(mockUserWithoutCouple.id, 'exp-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if expense is not found or belongs to another couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expense.findFirst.mockResolvedValue(null);

      await expect(service.findOne(mockUser.id, 'other-couple-exp')).rejects.toThrow(NotFoundException);
    });

    it('should return expense when found and belonging to the user couple', async () => {
      const mockExpense = {
        id: 'exp-uuid',
        description: 'Super',
        amount: 80,
        coupleId: mockUser.coupleId,
        deletedAt: null,
        splits: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expense.findFirst.mockResolvedValue(mockExpense);

      const result = await service.findOne(mockUser.id, 'exp-uuid');

      expect(result).toEqual(mockExpense);
      expect(mockPrismaService.expense.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'exp-uuid',
          coupleId: mockUser.coupleId,
          deletedAt: null,
        },
        include: { splits: true },
      });
    });
  });

  describe('update', () => {
    it('should throw BadRequestException if user is not found or has no couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithoutCouple);

      await expect(
        service.update(mockUserWithoutCouple.id, 'exp-id', { description: 'New description' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if expense is not found or belongs to another couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expense.findFirst.mockResolvedValue(null);

      await expect(
        service.update(mockUser.id, 'exp-id', { description: 'New description' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should successfully update the expense fields', async () => {
      const mockExpense = {
        id: 'exp-uuid',
        description: 'Super',
        amount: 80,
        coupleId: mockUser.coupleId,
        deletedAt: null,
      };

      const updateDto = {
        description: 'New Description',
        amount: 90,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        ...updateDto,
      });

      const result = await service.update(mockUser.id, 'exp-uuid', updateDto);

      expect(result.description).toEqual(updateDto.description);
      expect(result.amount).toEqual(updateDto.amount);
      expect(mockPrismaService.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp-uuid' },
        data: updateDto,
      });
    });
  });

  describe('remove', () => {
    it('should throw BadRequestException if user is not found or has no couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithoutCouple);

      await expect(service.remove(mockUserWithoutCouple.id, 'exp-id')).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if expense is not found or belongs to another couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expense.findFirst.mockResolvedValue(null);

      await expect(service.remove(mockUser.id, 'exp-id')).rejects.toThrow(NotFoundException);
    });

    it('should perform soft-delete by setting deletedAt', async () => {
      const mockExpense = {
        id: 'exp-uuid',
        description: 'Super',
        amount: 80,
        coupleId: mockUser.coupleId,
        deletedAt: null,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.expense.findFirst.mockResolvedValue(mockExpense);
      mockPrismaService.expense.update.mockResolvedValue({
        ...mockExpense,
        deletedAt: new Date(),
      });

      const result = await service.remove(mockUser.id, 'exp-uuid');

      expect(result.deletedAt).toBeDefined();
      expect(mockPrismaService.expense.update).toHaveBeenCalledWith({
        where: { id: 'exp-uuid' },
        data: {
          deletedAt: expect.any(Date),
        },
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('PaymentsService', () => {
  let service: PaymentsService;

  const mockUser = {
    id: 'user-1',
    name: 'Juan',
    email: 'juan@test.com',
    coupleId: 'couple-1',
  };

  const mockPartner = {
    id: 'user-2',
    name: 'Maria',
    email: 'maria@test.com',
    coupleId: 'couple-1',
  };

  const mockUserWithoutCouple = {
    ...mockUser,
    coupleId: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ──────────────────────────────────────────────
  // create
  // ──────────────────────────────────────────────
  describe('create', () => {
    it('should throw NotFoundException if payer is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent', { amount: 100, toUserId: 'user-2' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payer has no couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithoutCouple);

      await expect(
        service.create('user-1', { amount: 100, toUserId: 'user-2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user tries to pay themselves', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create('user-1', { amount: 100, toUserId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if recipient is not found', async () => {
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser)   // payer
        .mockResolvedValueOnce(null);      // recipient not found

      await expect(
        service.create('user-1', { amount: 100, toUserId: 'user-999' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if recipient belongs to a different couple', async () => {
      const outsider = { ...mockPartner, coupleId: 'couple-OTHER' };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(outsider);

      await expect(
        service.create('user-1', { amount: 100, toUserId: 'user-2' }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should create and return a payment for a valid request', async () => {
      const mockPayment = {
        id: 'payment-1',
        amount: 100,
        fromUserId: 'user-1',
        toUserId: 'user-2',
        coupleId: 'couple-1',
      };

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockUser)
        .mockResolvedValueOnce(mockPartner);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const result = await service.create('user-1', { amount: 100, toUserId: 'user-2' });

      expect(result).toEqual(mockPayment);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          amount: 100,
          fromUserId: 'user-1',
          toUserId: 'user-2',
          coupleId: 'couple-1',
        },
      });
    });
  });

  // ──────────────────────────────────────────────
  // findAll
  // ──────────────────────────────────────────────
  describe('findAll', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.findAll('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not in a couple', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUserWithoutCouple);

      await expect(service.findAll('user-1')).rejects.toThrow(BadRequestException);
    });

    it('should return payments for the couple ordered by createdAt desc', async () => {
      const mockPayments = [
        { id: 'p-2', amount: 200, fromUser: { id: 'user-2', name: 'Maria' }, toUser: { id: 'user-1', name: 'Juan' } },
        { id: 'p-1', amount: 100, fromUser: { id: 'user-1', name: 'Juan' }, toUser: { id: 'user-2', name: 'Maria' } },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service.findAll('user-1');

      expect(result).toEqual(mockPayments);
      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith({
        where: { coupleId: 'couple-1' },
        include: {
          fromUser: { select: { id: true, name: true } },
          toUser: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});

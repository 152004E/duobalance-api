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

  const groupId = 'group-1';

  const mockUser = {
    id: 'user-1',
    firstName: 'Juan',
    lastName: 'Perez',
    email: 'juan@test.com',
  };

  const mockPartner = {
    id: 'user-2',
    firstName: 'Maria',
    lastName: 'Lopez',
    email: 'maria@test.com',
  };

  const mockGroupMember = {
    userId: 'user-1',
    groupId,
    role: 'OWNER',
  };

  const mockPartnerGroupMember = {
    userId: 'user-2',
    groupId,
    role: 'ADMIN',
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    groupMember: {
      findFirst: jest.fn(),
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

  describe('create', () => {
    it('should throw NotFoundException if payer is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create('nonexistent', { amount: 100, toUserId: 'user-2' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if payer has no group', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findFirst.mockResolvedValue(null);

      await expect(
        service.create('user-1', { amount: 100, toUserId: 'user-2' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user tries to pay themselves', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findFirst.mockResolvedValue(
        mockGroupMember,
      );

      await expect(
        service.create('user-1', { amount: 100, toUserId: 'user-1' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if recipient is not found', async () => {
      mockPrismaService.user.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'user-1') return Promise.resolve(mockUser);
        return Promise.resolve(null);
      });
      mockPrismaService.groupMember.findFirst.mockResolvedValue(
        mockGroupMember,
      );
      mockPrismaService.groupMember.findUnique.mockResolvedValue(
        mockGroupMember,
      );

      await expect(
        service.create('user-1', { amount: 100, toUserId: 'user-999' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if recipient belongs to a different group', async () => {
      mockPrismaService.user.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'user-1') return Promise.resolve(mockUser);
        if (where.id === 'user-2') return Promise.resolve(mockPartner);
        return Promise.resolve(null);
      });
      mockPrismaService.groupMember.findFirst.mockResolvedValue(
        mockGroupMember,
      );
      mockPrismaService.groupMember.findUnique
        .mockResolvedValueOnce(mockGroupMember)
        .mockResolvedValueOnce(null);

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
        groupId,
      };

      mockPrismaService.user.findUnique.mockImplementation(({ where }) => {
        if (where.id === 'user-1') return Promise.resolve(mockUser);
        if (where.id === 'user-2') return Promise.resolve(mockPartner);
        return Promise.resolve(null);
      });
      mockPrismaService.groupMember.findFirst.mockResolvedValue(
        mockGroupMember,
      );
      mockPrismaService.groupMember.findUnique
        .mockResolvedValueOnce(mockGroupMember)
        .mockResolvedValueOnce(mockPartnerGroupMember);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);

      const result = await service.create('user-1', {
        amount: 100,
        toUserId: 'user-2',
      });

      expect(result).toEqual(mockPayment);
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith({
        data: {
          amount: 100,
          fromUserId: 'user-1',
          toUserId: 'user-2',
          groupId,
        },
      });
    });
  });

  describe('findAll', () => {
    it('should throw NotFoundException if user is not found', async () => {
      mockPrismaService.user.findUnique.mockImplementation(() =>
        Promise.resolve(null),
      );

      await expect(service.findAll('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user is not in a group', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findFirst.mockResolvedValue(null);

      await expect(service.findAll('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return payments for the group ordered by createdAt desc', async () => {
      const mockPayments = [
        {
          id: 'p-2',
          amount: 200,
          fromUser: { id: 'user-2', firstName: 'Maria', lastName: 'Lopez' },
          toUser: { id: 'user-1', firstName: 'Juan', lastName: 'Perez' },
        },
        {
          id: 'p-1',
          amount: 100,
          fromUser: { id: 'user-1', firstName: 'Juan', lastName: 'Perez' },
          toUser: { id: 'user-2', firstName: 'Maria', lastName: 'Lopez' },
        },
      ];

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findFirst.mockResolvedValue(
        mockGroupMember,
      );
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service.findAll('user-1');

      expect(result).toEqual(mockPayments);
      expect(mockPrismaService.payment.findMany).toHaveBeenCalledWith({
        where: { groupId },
        include: {
          fromUser: { select: { id: true, firstName: true, lastName: true } },
          toUser: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  });
});

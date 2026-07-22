import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SettlementsService', () => {
  let service: SettlementsService;

  const userId = 'user-1';
  const partnerId = 'partner-1';
  const groupId = 'group-1';

  const baseUser = { id: userId };
  const baseGroup = {
    id: groupId,
    name: 'Test Group',
    members: [
      { user: { id: userId, firstName: 'Juan', lastName: 'Perez' } },
      { user: { id: partnerId, firstName: 'Maria', lastName: 'Lopez' } },
    ],
  };
  const baseGroupMember = { userId, groupId, role: 'OWNER' };

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
    },
    group: {
      findUnique: jest.fn(),
    },
    groupMember: {
      findFirst: jest.fn(),
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
    jest.clearAllMocks();
  });

  describe('suggest', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.suggest(userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user has no group', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      await expect(service.suggest(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return empty suggestions when no expenses', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.groupMember.findFirst.mockResolvedValue(baseGroupMember);
      mockPrisma.group.findUnique.mockResolvedValue(baseGroup);
      mockPrisma.expense.findMany.mockResolvedValue([]);

      const result = await service.suggest(userId);

      expect(result.group.id).toBe(groupId);
      expect(result.members).toHaveLength(2);
      expect(result.members.every((m) => m.balance === 0)).toBe(true);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should suggest one payment for 2-member EQUAL', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.groupMember.findFirst.mockResolvedValue(baseGroupMember);
      mockPrisma.group.findUnique.mockResolvedValue(baseGroup);
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 200, splitType: 'EQUAL', splits: [] },
        { paidById: partnerId, amount: 100, splitType: 'EQUAL', splits: [] },
      ]);

      const result = await service.suggest(userId);

      expect(result.members).toHaveLength(2);
      expect(result.members.find((m) => m.user.id === userId)?.balance).toBe(
        50,
      );
      expect(result.members.find((m) => m.user.id === partnerId)?.balance).toBe(
        -50,
      );
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].from.id).toBe(partnerId);
      expect(result.suggestions[0].to.id).toBe(userId);
      expect(result.suggestions[0].amount).toBe(50);
    });

    it('should return empty suggestions when already settled', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.groupMember.findFirst.mockResolvedValue(baseGroupMember);
      mockPrisma.group.findUnique.mockResolvedValue(baseGroup);
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: userId, amount: 150, splitType: 'EQUAL', splits: [] },
        { paidById: partnerId, amount: 150, splitType: 'EQUAL', splits: [] },
      ]);

      const result = await service.suggest(userId);

      expect(result.suggestions).toHaveLength(0);
    });

    it('should minimize transactions for 3 members', async () => {
      const group3 = {
        id: 'group-3',
        name: 'Trio',
        members: [
          { user: { id: 'u1', firstName: 'A', lastName: 'X' } },
          { user: { id: 'u2', firstName: 'B', lastName: 'Y' } },
          { user: { id: 'u3', firstName: 'C', lastName: 'Z' } },
        ],
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u1' });
      mockPrisma.groupMember.findFirst.mockResolvedValue({
        userId: 'u1',
        groupId: 'group-3',
        role: 'OWNER',
      });
      mockPrisma.group.findUnique.mockResolvedValue(group3);
      mockPrisma.expense.findMany.mockResolvedValue([
        { paidById: 'u1', amount: 300, splitType: 'EQUAL', splits: [] },
      ]);

      const result = await service.suggest('u1');

      expect(result.members).toHaveLength(3);
      expect(result.members.find((m) => m.user.id === 'u1')?.balance).toBe(200);
      expect(result.members.find((m) => m.user.id === 'u2')?.balance).toBe(
        -100,
      );
      expect(result.members.find((m) => m.user.id === 'u3')?.balance).toBe(
        -100,
      );

      expect(result.suggestions).toHaveLength(2);
      expect(result.suggestions[0].amount).toBe(100);
      expect(result.suggestions[1].amount).toBe(100);
    });

    it('should handle PERCENTAGE splits correctly', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.groupMember.findFirst.mockResolvedValue(baseGroupMember);
      mockPrisma.group.findUnique.mockResolvedValue(baseGroup);
      mockPrisma.expense.findMany.mockResolvedValue([
        {
          paidById: userId,
          amount: 100,
          splitType: 'PERCENTAGE',
          splits: [
            { userId, percentage: 70 },
            { userId: partnerId, percentage: 30 },
          ],
        },
      ]);

      const result = await service.suggest(userId);

      expect(result.members.find((m) => m.user.id === userId)?.balance).toBe(
        30,
      );
      expect(result.members.find((m) => m.user.id === partnerId)?.balance).toBe(
        -30,
      );
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].amount).toBe(30);
    });
  });

  describe('calculate', () => {
    it('should throw NotFoundException when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.calculate(userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException when user has no group', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.groupMember.findFirst.mockResolvedValue(null);

      await expect(service.calculate(userId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return all zeros and SETTLED when no expenses or payments', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.groupMember.findFirst.mockResolvedValue(baseGroupMember);
      mockPrisma.group.findUnique.mockResolvedValue(baseGroup);
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
      mockPrisma.groupMember.findFirst.mockResolvedValue(baseGroupMember);
      mockPrisma.group.findUnique.mockResolvedValue(baseGroup);
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
          groupId,
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
      mockPrisma.groupMember.findFirst.mockResolvedValue(baseGroupMember);
      mockPrisma.group.findUnique.mockResolvedValue(baseGroup);
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
          groupId,
        },
      ]);

      const result = await service.calculate(userId);

      expect(result.netSettlement).toBe(0);
      expect(result.settlementDirection).toBe('SETTLED');
    });

    it('should return I_OWE when payment exceeds balance', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.groupMember.findFirst.mockResolvedValue(baseGroupMember);
      mockPrisma.group.findUnique.mockResolvedValue(baseGroup);
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
          groupId,
        },
      ]);

      const result = await service.calculate(userId);

      expect(result.netSettlement).toBe(20);
      expect(result.settlementDirection).toBe('I_OWE');
    });

    it('should handle PERCENTAGE splits in settlement', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(baseUser);
      mockPrisma.groupMember.findFirst.mockResolvedValue(baseGroupMember);
      mockPrisma.group.findUnique.mockResolvedValue(baseGroup);
      mockPrisma.expense.findMany.mockResolvedValue([
        {
          paidById: userId,
          amount: 100,
          splitType: 'PERCENTAGE',
          splits: [
            { userId, percentage: 70 },
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
          groupId,
        },
      ]);

      const result = await service.calculate(userId);

      expect(result.balanceAmount).toBe(30);
      expect(result.balanceDirection).toBe('OWED_TO_ME');
      expect(result.paymentsReceived).toBe(10);
      expect(result.netSettlement).toBe(20);
      expect(result.settlementDirection).toBe('OWED_TO_ME');
    });
  });
});

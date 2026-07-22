import { Test, TestingModule } from '@nestjs/testing';
import { GroupsService } from './groups.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('GroupsService', () => {
  let service: GroupsService;

  const mockUser = {
    id: 'user-1',
    firstName: 'Juan',
    lastName: 'Perez',
    email: 'juan@test.com',
  };
  const mockGroup = {
    id: 'group-1',
    name: 'Test Group',
    type: 'COUPLE',
    inviteCode: 'ABCD1234',
    members: [{ userId: 'user-1', role: 'OWNER' }],
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    group: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      delete: jest.fn(),
    },
    groupMember: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    expenseSplit: {
      deleteMany: jest.fn(),
    },
    expense: {
      deleteMany: jest.fn(),
    },
    payment: {
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createGroup', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.createGroup('nonexistent', { name: 'Test' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create and return a new group', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      const createdGroup = {
        ...mockGroup,
        members: [{ user: mockUser, role: 'OWNER' }],
      };
      mockPrismaService.group.create.mockResolvedValue(createdGroup);

      const result = await service.createGroup('user-1', {
        name: 'Test Group',
        type: 'COUPLE',
      });

      expect(result).toEqual(createdGroup);
      expect(mockPrismaService.group.create).toHaveBeenCalled();
    });
  });

  describe('joinGroup', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.joinGroup('nonexistent', 'CODE')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if user already belongs to group', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findFirst.mockResolvedValue({
        id: 'membership-1',
      });

      await expect(service.joinGroup('user-1', 'CODE')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if invite code is invalid', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findFirst.mockResolvedValue(null);
      mockPrismaService.group.findUnique.mockResolvedValue(null);

      await expect(service.joinGroup('user-1', 'INVALID')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if group is PERSONAL type', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findFirst.mockResolvedValue(null);
      mockPrismaService.group.findUnique.mockResolvedValue({
        ...mockGroup,
        type: 'PERSONAL',
        members: [],
      });

      await expect(service.joinGroup('user-1', 'CODE')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should join group successfully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findFirst.mockResolvedValue(null);
      mockPrismaService.group.findUnique
        .mockResolvedValueOnce({
          ...mockGroup,
          members: [{ userId: 'user-2' }],
        })
        .mockResolvedValueOnce({
          ...mockGroup,
          members: [{ user: mockUser, role: 'MEMBER' }],
        });

      const result = await service.joinGroup('user-1', 'ABCD1234');

      expect(result).toBeDefined();
      expect(mockPrismaService.groupMember.create).toHaveBeenCalled();
    });
  });

  describe('getMyGroups', () => {
    it('should return list of groups for user', async () => {
      mockPrismaService.group.findMany.mockResolvedValue([mockGroup]);

      const result = await service.getMyGroups('user-1');

      expect(result).toEqual([mockGroup]);
      expect(mockPrismaService.group.findMany).toHaveBeenCalledWith({
        where: { members: { some: { userId: 'user-1' } } },
        include: expect.any(Object),
      });
    });
  });

  describe('getGroup', () => {
    it('should throw ForbiddenException if user is not a member', async () => {
      mockPrismaService.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.getGroup('user-1', 'group-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return group data', async () => {
      mockPrismaService.groupMember.findUnique.mockResolvedValue({
        userId: 'user-1',
        groupId: 'group-1',
      });
      mockPrismaService.group.findUnique.mockResolvedValue(mockGroup);

      const result = await service.getGroup('user-1', 'group-1');

      expect(result).toEqual(mockGroup);
    });
  });

  describe('leaveGroup', () => {
    it('should throw NotFoundException if user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.leaveGroup('nonexistent', 'group-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not a member', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findUnique.mockResolvedValue(null);

      await expect(service.leaveGroup('user-1', 'group-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return "Left group successfully" if other members remain', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findUnique.mockResolvedValue({
        userId: 'user-1',
        groupId: 'group-1',
      });
      mockPrismaService.groupMember.count.mockResolvedValue(1);

      const result = await service.leaveGroup('user-1', 'group-1');

      expect(result).toEqual({ message: 'Left group successfully' });
    });

    it('should delete the group when last member leaves', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.groupMember.findUnique.mockResolvedValue({
        userId: 'user-1',
        groupId: 'group-1',
      });
      mockPrismaService.groupMember.count.mockResolvedValue(0);

      const result = await service.leaveGroup('user-1', 'group-1');

      expect(result).toEqual({ message: 'Group deleted' });
      expect(mockPrismaService.group.delete).toHaveBeenCalledWith({
        where: { id: 'group-1' },
      });
    });
  });
});

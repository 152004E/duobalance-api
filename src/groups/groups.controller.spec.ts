import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';

describe('GroupsController', () => {
  let controller: GroupsController;
  let service: GroupsService;

  const mockGroupsService = {
    createGroup: jest.fn(),
    joinGroup: jest.fn(),
    getMyGroups: jest.fn(),
    getGroup: jest.fn(),
    leaveGroup: jest.fn(),
  };

  const mockReq = { user: { id: 'user-uuid-1' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [{ provide: GroupsService, useValue: mockGroupsService }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GroupsController>(GroupsController);
    service = module.get<GroupsService>(GroupsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createGroup', () => {
    it('should call groupsService.createGroup with user id and dto', async () => {
      const dto: CreateGroupDto = { name: 'Test Group', type: 'COUPLE' };
      const mockGroup = {
        id: 'group-1',
        name: 'Test Group',
        inviteCode: 'ABCD1234',
      };
      mockGroupsService.createGroup.mockResolvedValue(mockGroup);

      const result = await controller.createGroup(mockReq, dto);

      expect(result).toEqual(mockGroup);
      expect(service.createGroup).toHaveBeenCalledWith(mockReq.user.id, dto);
    });
  });

  describe('joinGroup', () => {
    it('should call groupsService.joinGroup with user id and invite code', async () => {
      const dto: JoinGroupDto = { inviteCode: 'ABCD1234' };
      const mockGroup = { id: 'group-1', inviteCode: 'ABCD1234' };
      mockGroupsService.joinGroup.mockResolvedValue(mockGroup);

      const result = await controller.joinGroup(mockReq, dto);

      expect(result).toEqual(mockGroup);
      expect(service.joinGroup).toHaveBeenCalledWith(
        mockReq.user.id,
        'ABCD1234',
      );
    });
  });

  describe('getMyGroups', () => {
    it('should call groupsService.getMyGroups with user id', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          name: 'Test Group',
          inviteCode: 'ABCD1234',
          members: [],
        },
      ];
      mockGroupsService.getMyGroups.mockResolvedValue(mockGroups);

      const result = await controller.getMyGroups(mockReq);

      expect(result).toEqual(mockGroups);
      expect(service.getMyGroups).toHaveBeenCalledWith(mockReq.user.id);
    });
  });

  describe('getGroup', () => {
    it('should call groupsService.getGroup with user id and group id', async () => {
      const mockGroup = {
        id: 'group-1',
        name: 'Test Group',
        inviteCode: 'ABCD1234',
        members: [],
      };
      mockGroupsService.getGroup.mockResolvedValue(mockGroup);

      const result = await controller.getGroup(mockReq, 'group-1');

      expect(result).toEqual(mockGroup);
      expect(service.getGroup).toHaveBeenCalledWith(mockReq.user.id, 'group-1');
    });
  });

  describe('leaveGroup', () => {
    it('should call groupsService.leaveGroup with user id and group id', async () => {
      const mockResponse = { message: 'Left group successfully' };
      mockGroupsService.leaveGroup.mockResolvedValue(mockResponse);

      const result = await controller.leaveGroup(mockReq, 'group-1');

      expect(result).toEqual(mockResponse);
      expect(service.leaveGroup).toHaveBeenCalledWith(
        mockReq.user.id,
        'group-1',
      );
    });
  });
});

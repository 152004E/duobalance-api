import { Test, TestingModule } from '@nestjs/testing';
import { CouplesController } from './couples.controller';
import { CouplesService } from './couples.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('CouplesController', () => {
  let controller: CouplesController;
  let service: CouplesService;

  const mockCouplesService = {
    createCouple: jest.fn(),
    joinCouple: jest.fn(),
    getMyCouple: jest.fn(),
    leaveCouple: jest.fn(),
  };

  const mockReq = { user: { id: 'user-uuid-1' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CouplesController],
      providers: [
        { provide: CouplesService, useValue: mockCouplesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CouplesController>(CouplesController);
    service = module.get<CouplesService>(CouplesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCouple', () => {
    it('should call couplesService.createCouple with user id', async () => {
      const mockCouple = { id: 'couple-1', inviteCode: 'ABCD1234' };
      mockCouplesService.createCouple.mockResolvedValue(mockCouple);

      const result = await controller.createCouple(mockReq);

      expect(result).toEqual(mockCouple);
      expect(service.createCouple).toHaveBeenCalledWith(mockReq.user.id);
    });
  });

  describe('joinCouple', () => {
    it('should call couplesService.joinCouple with user id and invite code', async () => {
      const mockCouple = { id: 'couple-1', inviteCode: 'ABCD1234' };
      mockCouplesService.joinCouple.mockResolvedValue(mockCouple);

      const result = await controller.joinCouple(mockReq, 'ABCD1234');

      expect(result).toEqual(mockCouple);
      expect(service.joinCouple).toHaveBeenCalledWith(mockReq.user.id, 'ABCD1234');
    });
  });

  describe('getMyCouple', () => {
    it('should call couplesService.getMyCouple with user id', async () => {
      const mockCouple = { id: 'couple-1', inviteCode: 'ABCD1234', users: [] };
      mockCouplesService.getMyCouple.mockResolvedValue(mockCouple);

      const result = await controller.getMyCouple(mockReq);

      expect(result).toEqual(mockCouple);
      expect(service.getMyCouple).toHaveBeenCalledWith(mockReq.user.id);
    });
  });

  describe('leaveCouple', () => {
    it('should call couplesService.leaveCouple with user id', async () => {
      const mockResponse = { message: 'Left couple successfully' };
      mockCouplesService.leaveCouple.mockResolvedValue(mockResponse);

      const result = await controller.leaveCouple(mockReq);

      expect(result).toEqual(mockResponse);
      expect(service.leaveCouple).toHaveBeenCalledWith(mockReq.user.id);
    });
  });
});

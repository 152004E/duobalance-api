import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreatePaymentDto } from './dto/create-payment.dto';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPaymentsService = {
    create: jest.fn(),
    findAll: jest.fn(),
  };

  const mockReq = { user: { id: 'user-uuid-1' } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call paymentsService.create with user id and dto', async () => {
      const dto: CreatePaymentDto = { amount: 100, toUserId: 'user-2' };
      const expectedResponse = {
        id: 'payment-1',
        amount: 100,
        fromUserId: mockReq.user.id,
        toUserId: 'user-2',
        coupleId: 'couple-1',
      };
      mockPaymentsService.create.mockResolvedValue(expectedResponse);

      const result = await controller.create(mockReq, dto);

      expect(result).toEqual(expectedResponse);
      expect(service.create).toHaveBeenCalledWith(mockReq.user.id, dto);
    });
  });

  describe('findAll', () => {
    it('should call paymentsService.findAll with user id', async () => {
      const expectedResponse = [
        { id: 'p-1', amount: 50, fromUser: { id: mockReq.user.id, name: 'Juan' }, toUser: { id: 'user-2', name: 'Maria' } },
      ];
      mockPaymentsService.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(mockReq);

      expect(result).toEqual(expectedResponse);
      expect(service.findAll).toHaveBeenCalledWith(mockReq.user.id);
    });
  });
});

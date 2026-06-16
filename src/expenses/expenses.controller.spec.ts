import { Test, TestingModule } from '@nestjs/testing';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { ExpenseCategory, SplitType } from '../generated/enums';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

describe('ExpensesController', () => {
  let controller: ExpensesController;
  let service: ExpensesService;

  const mockExpensesService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  const mockReq = {
    user: {
      id: 'user-uuid-123',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExpensesController],
      providers: [
        { provide: ExpensesService, useValue: mockExpensesService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ExpensesController>(ExpensesController);
    service = module.get<ExpensesService>(ExpensesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call expensesService.create with correct parameters', async () => {
      const dto: CreateExpenseDto = {
        description: 'Supermercado',
        amount: 150,
        category: ExpenseCategory.FOOD,
        splitType: SplitType.EQUAL,
      };

      const expectedResponse = { id: 'exp-1', ...dto, paidById: mockReq.user.id };
      mockExpensesService.create.mockResolvedValue(expectedResponse);

      const result = await controller.create(mockReq, dto);

      expect(result).toEqual(expectedResponse);
      expect(service.create).toHaveBeenCalledWith(mockReq.user.id, dto);
    });
  });

  describe('findAll', () => {
    it('should call expensesService.findAll with query parameters', async () => {
      const query: QueryExpenseDto = {
        category: ExpenseCategory.TRANSPORT,
        splitType: SplitType.PERSONAL,
      };

      const expectedResponse = [{ id: 'exp-1', description: 'Uber', amount: 20 }];
      mockExpensesService.findAll.mockResolvedValue(expectedResponse);

      const result = await controller.findAll(mockReq, query);

      expect(result).toEqual(expectedResponse);
      expect(service.findAll).toHaveBeenCalledWith(mockReq.user.id, query);
    });
  });

  describe('findOne', () => {
    it('should call expensesService.findOne with expense ID', async () => {
      const expenseId = 'expense-123';
      const expectedResponse = { id: expenseId, description: 'Cena', amount: 100 };
      mockExpensesService.findOne.mockResolvedValue(expectedResponse);

      const result = await controller.findOne(mockReq, expenseId);

      expect(result).toEqual(expectedResponse);
      expect(service.findOne).toHaveBeenCalledWith(mockReq.user.id, expenseId);
    });
  });

  describe('update', () => {
    it('should call expensesService.update with parameters and body', async () => {
      const expenseId = 'expense-123';
      const dto: UpdateExpenseDto = {
        description: 'Updated Cena',
        amount: 110,
      };

      const expectedResponse = { id: expenseId, ...dto };
      mockExpensesService.update.mockResolvedValue(expectedResponse);

      const result = await controller.update(mockReq, expenseId, dto);

      expect(result).toEqual(expectedResponse);
      expect(service.update).toHaveBeenCalledWith(mockReq.user.id, expenseId, dto);
    });
  });

  describe('remove', () => {
    it('should call expensesService.remove with expense ID', async () => {
      const expenseId = 'expense-123';
      const expectedResponse = { id: expenseId, deletedAt: new Date() };
      mockExpensesService.remove.mockResolvedValue(expectedResponse);

      const result = await controller.remove(mockReq, expenseId);

      expect(result).toEqual(expectedResponse);
      expect(service.remove).toHaveBeenCalledWith(mockReq.user.id, expenseId);
    });
  });
});

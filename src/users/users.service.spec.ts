import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';

describe('UsersService', () => {
  let service: UsersService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findByEmail', () => {
    it('should call prisma.user.findUnique with the correct email', async () => {
      const email = 'juan@example.com';
      const mockUser = { id: 'uuid-1', firstName: 'Juan', lastName: 'Perez', email };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findByEmail(email);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
    });

    it('should return null if user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.findByEmail('nonexistent@example.com');

      expect(result).toBeNull();
    });
  });

  describe('findById', () => {
    it('should call prisma.user.findUnique with the correct id', async () => {
      const id = 'uuid-1';
      const mockUser = { id, firstName: 'Juan', lastName: 'Perez', email: 'juan@example.com' };
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.findById(id);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id },
      });
    });
  });

  describe('create', () => {
    it('should create a new user', async () => {
      const data = { firstName: 'Juan', lastName: 'Perez', email: 'juan@example.com', password: 'hashed-password' };
      const created = { id: 'uuid-1', ...data };
      mockPrismaService.user.create.mockResolvedValue(created);

      const result = await service.create(data);

      expect(result).toEqual(created);
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({ data });
    });
  });
});

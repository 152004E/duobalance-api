import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(
    userId: string,
    dto: CreateExpenseDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.coupleId) {
      throw new BadRequestException(
        'User is not part of a couple',
      );
    }

    return this.prisma.expense.create({
      data: {
        description: dto.description,
        amount: dto.amount,
        category: dto.category,
        splitType: dto.splitType,

        paidById: user.id,
        coupleId: user.coupleId,
      },
    });
  }
  async findAll(
    userId: string,
    query?: QueryExpenseDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.coupleId) {
      throw new BadRequestException(
        'User is not part of a couple',
      );
    }

    return this.prisma.expense.findMany({
      where: {
        coupleId: user.coupleId,
        deletedAt: null,
        ...(query?.category && { category: query.category }),
        ...(query?.splitType && { splitType: query.splitType }),
        ...(query?.startDate || query?.endDate || query?.minAmount != null || query?.maxAmount != null
          ? {
              AND: [
                ...(query?.startDate
                  ? [{ createdAt: { gte: new Date(query.startDate) } }]
                  : []),
                ...(query?.endDate
                  ? [{ createdAt: { lte: new Date(query.endDate) } }]
                  : []),
                ...(query?.minAmount != null
                  ? [{ amount: { gte: query.minAmount } }]
                  : []),
                ...(query?.maxAmount != null
                  ? [{ amount: { lte: query.maxAmount } }]
                  : []),
              ],
            }
          : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async findOne(
    userId: string,
    expenseId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.coupleId) {
      throw new BadRequestException(
        'User is not part of a couple',
      );
    }

    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        coupleId: user.coupleId,
        deletedAt: null,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }
  async update(
    userId: string,
    expenseId: string,
    dto: UpdateExpenseDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.coupleId) {
      throw new BadRequestException();
    }

    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        coupleId: user.coupleId,
        deletedAt: null,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.expense.update({
      where: {
        id: expenseId,
      },
      data: dto,
    });
  }
  async remove(
    userId: string,
    expenseId: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.coupleId) {
      throw new BadRequestException();
    }

    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        coupleId: user.coupleId,
        deletedAt: null,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return this.prisma.expense.update({
      where: {
        id: expenseId,
      },
      data: {
        deletedAt: new Date(),
      },
    });
  }
}
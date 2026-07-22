import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { calculateSplitsTotal } from '../common/utils/expense-share';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  private async getGroupId(userId: string, preferredGroupId?: string) {
    if (preferredGroupId) {
      const membership = await this.prisma.groupMember.findUnique({
        where: { userId_groupId: { userId, groupId: preferredGroupId } },
      });
      if (!membership) {
        throw new BadRequestException('User is not a member of this group');
      }
      return preferredGroupId;
    }

    const membership = await this.prisma.groupMember.findFirst({
      where: { userId },
    });

    if (!membership) {
      throw new BadRequestException('User does not belong to any group');
    }

    return membership.groupId;
  }

  async create(userId: string, dto: CreateExpenseDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const groupId = await this.getGroupId(userId, dto.groupId);

    if (dto.splitType === 'PERCENTAGE') {
      if (!dto.splits || dto.splits.length !== 2) {
        throw new BadRequestException(
          'PERCENTAGE split must have exactly 2 splits',
        );
      }

      const total = calculateSplitsTotal(
        dto.splits.map((s) => ({
          percentage: { toString: () => String(s.percentage) },
        })),
      );

      if (total !== 100) {
        throw new BadRequestException('PERCENTAGE splits must sum to 100');
      }
    }

    const expense = await this.prisma.expense.create({
      data: {
        description: dto.description,
        amount: dto.amount,
        category: dto.category,
        splitType: dto.splitType,
        paidById: user.id,
        groupId,
        ...(dto.splits && {
          splits: {
            create: dto.splits.map((s) => ({
              percentage: s.percentage,
              userId: s.userId,
            })),
          },
        }),
      },
    });

    return this.prisma.expense.findUnique({
      where: { id: expense.id },
      include: { splits: true },
    });
  }

  async findAll(userId: string, query?: QueryExpenseDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const groupId = await this.getGroupId(userId, query?.groupId);

    return this.prisma.expense.findMany({
      where: {
        groupId,
        deletedAt: null,
        ...(query?.category && { category: query.category }),
        ...(query?.splitType && { splitType: query.splitType }),
        ...(query?.startDate ||
        query?.endDate ||
        query?.minAmount != null ||
        query?.maxAmount != null
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
      include: { splits: true },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(userId: string, expenseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const groupId = await this.getGroupId(userId);

    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        groupId,
        deletedAt: null,
      },
      include: { splits: true },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    return expense;
  }

  async update(userId: string, expenseId: string, dto: UpdateExpenseDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const groupId = await this.getGroupId(userId);

    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        groupId,
        deletedAt: null,
      },
    });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    const { splits: _splits, ...updateData } = dto;

    return this.prisma.expense.update({
      where: {
        id: expenseId,
      },
      data: updateData,
    });
  }

  async remove(userId: string, expenseId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const groupId = await this.getGroupId(userId);

    const expense = await this.prisma.expense.findFirst({
      where: {
        id: expenseId,
        groupId,
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

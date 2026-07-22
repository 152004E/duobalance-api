import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BalancesService } from '../balances/balances.service';
import { SettlementsService } from '../settlements/settlements.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly balancesService: BalancesService,
    private readonly settlementsService: SettlementsService,
  ) {}

  async getSummary(userId: string, groupId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const targetGroupId = groupId ?? (await this.getDefaultGroupId(userId));

    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: targetGroupId } },
    });

    if (!membership) {
      throw new BadRequestException('User is not a member of this group');
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    const balance = await this.balancesService.calculate(userId, targetGroupId);

    const settlement = await this.settlementsService.calculate(
      userId,
      targetGroupId,
    );

    const monthExpenses = await this.prisma.expense.findMany({
      where: {
        groupId: targetGroupId,
        deletedAt: null,
        splitType: { not: 'PERSONAL' },
        createdAt: { gte: startOfMonth },
      },
    });

    const monthExpensesTotal = monthExpenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );

    const expenseCount = monthExpenses.length;

    const lastMonthExpenses = await this.prisma.expense.findMany({
      where: {
        groupId: targetGroupId,
        deletedAt: null,
        splitType: { not: 'PERSONAL' },
        createdAt: {
          gte: startOfLastMonth,
          lte: endOfLastMonth,
        },
      },
    });

    const lastMonthTotal = lastMonthExpenses.reduce(
      (sum, e) => sum + Number(e.amount),
      0,
    );

    const categoryMap = new Map<string, number>();
    for (const expense of monthExpenses) {
      const cat = expense.category;
      categoryMap.set(
        cat,
        (categoryMap.get(cat) || 0) + Number(expense.amount),
      );
    }

    const expensesByCategory = Array.from(categoryMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);

    const topCategory =
      expensesByCategory.length > 0
        ? {
            name: expensesByCategory[0].category,
            amount: expensesByCategory[0].amount,
          }
        : null;

    const lastExpense =
      monthExpenses.length > 0
        ? {
            id: monthExpenses[monthExpenses.length - 1].id,
            description: monthExpenses[monthExpenses.length - 1].description,
            amount: Number(monthExpenses[monthExpenses.length - 1].amount),
            createdAt: monthExpenses[monthExpenses.length - 1].createdAt,
          }
        : null;

    const monthPayments = await this.prisma.payment.findMany({
      where: {
        groupId: targetGroupId,
        createdAt: { gte: startOfMonth },
      },
    });

    const monthPaymentsTotal = monthPayments.reduce(
      (sum, p) => sum + Number(p.amount),
      0,
    );

    const difference = monthExpensesTotal - lastMonthTotal;
    const percentageChange =
      lastMonthTotal > 0
        ? Math.round((difference / lastMonthTotal) * 100)
        : null;

    return {
      balance: {
        amount: balance.balance,
        direction: balance.direction,
      },
      settlement: {
        amount: settlement.netSettlement,
        direction: settlement.settlementDirection,
      },
      monthExpenses: monthExpensesTotal,
      expenseCount,
      monthPayments: monthPaymentsTotal,
      topCategory,
      expensesByCategory,
      lastExpense,
      monthlyComparison: {
        currentMonth: monthExpensesTotal,
        previousMonth: lastMonthTotal,
        difference,
        percentageChange,
      },
    };
  }

  private async getDefaultGroupId(userId: string) {
    const membership = await this.prisma.groupMember.findFirst({
      where: { userId },
    });

    if (!membership) {
      throw new BadRequestException('User does not belong to any group');
    }

    return membership.groupId;
  }
}

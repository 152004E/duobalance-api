import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateExpenseShare } from '../common/utils/expense-share';

@Injectable()
export class BalancesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async calculate(userId: string) {
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

    const expenses = await this.prisma.expense.findMany({
      where: {
        coupleId: user.coupleId,
        deletedAt: null,
        splitType: { in: ['EQUAL', 'PERCENTAGE'] },
      },
      include: { splits: true },
    });

    let totalPaidByMe = 0;
    let totalPaidByPartner = 0;
    let myShare = 0;
    let partnerShare = 0;

    for (const expense of expenses) {
      const amount = Number(expense.amount);

      if (expense.paidById === userId) {
        totalPaidByMe += amount;
      } else {
        totalPaidByPartner += amount;
      }

      const userShare = calculateExpenseShare(
        expense,
        userId,
        expense.splits,
      );
      const partnerShareForExpense = amount - userShare;

      myShare += userShare;
      partnerShare += partnerShareForExpense;
    }

    const totalExpenses = totalPaidByMe + totalPaidByPartner;
    const netBalance = totalPaidByMe - myShare;

    let direction: 'OWED_TO_ME' | 'I_OWE' | 'SETTLED';

    if (netBalance > 0) {
      direction = 'OWED_TO_ME';
    } else if (netBalance < 0) {
      direction = 'I_OWE';
    } else {
      direction = 'SETTLED';
    }

    return {
      totalExpenses,
      totalPaidByMe,
      totalPaidByPartner,
      myShare,
      partnerShare,
      balance: Math.abs(netBalance),
      direction,
    };
  }
}

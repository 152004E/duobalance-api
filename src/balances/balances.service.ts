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

  async calculate(userId: string, groupId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const targetGroupId = groupId
      ? (await this.validateMembership(userId, groupId))
      : (await this.getDefaultGroupId(userId));

    const expenses = await this.prisma.expense.findMany({
      where: {
        groupId: targetGroupId,
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

  private async validateMembership(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      throw new BadRequestException('User is not a member of this group');
    }

    return groupId;
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

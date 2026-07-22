import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateExpenseShare } from '../common/utils/expense-share';

@Injectable()
export class SettlementsService {
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

  async calculate(userId: string, groupId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const targetGroupId = await this.getGroupId(userId, groupId);

    const group = await this.prisma.group.findUnique({
      where: { id: targetGroupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

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
        group.members.length,
        expense.splits,
      );
      const partnerShareForExpense = amount - userShare;

      myShare += userShare;
      partnerShare += partnerShareForExpense;
    }

    const totalExpenses = totalPaidByMe + totalPaidByPartner;
    const signedBalance = totalPaidByMe - myShare;

    let balanceDirection: 'OWED_TO_ME' | 'I_OWE' | 'SETTLED';
    if (signedBalance > 0) {
      balanceDirection = 'OWED_TO_ME';
    } else if (signedBalance < 0) {
      balanceDirection = 'I_OWE';
    } else {
      balanceDirection = 'SETTLED';
    }

    const payments = await this.prisma.payment.findMany({
      where: { groupId: targetGroupId },
    });

    let paymentsMade = 0;
    let paymentsReceived = 0;

    for (const payment of payments) {
      const amount = Number(payment.amount);

      if (payment.fromUserId === userId) {
        paymentsMade += amount;
      } else if (payment.toUserId === userId) {
        paymentsReceived += amount;
      }
    }

    const netSettlementSigned = signedBalance - paymentsReceived + paymentsMade;

    let settlementDirection: 'OWED_TO_ME' | 'I_OWE' | 'SETTLED';
    if (netSettlementSigned > 0) {
      settlementDirection = 'OWED_TO_ME';
    } else if (netSettlementSigned < 0) {
      settlementDirection = 'I_OWE';
    } else {
      settlementDirection = 'SETTLED';
    }

    return {
      totalExpenses,
      totalPaidByMe,
      totalPaidByPartner,
      myShare,
      partnerShare,
      balanceAmount: Math.abs(signedBalance),
      balanceDirection,
      paymentsMade,
      paymentsReceived,
      netSettlement: Math.abs(netSettlementSigned),
      settlementDirection,
    };
  }

  async suggest(userId: string, preferredGroupId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const targetGroupId = await this.getGroupId(userId, preferredGroupId);

    const group = await this.prisma.group.findUnique({
      where: { id: targetGroupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    const memberCount = group.members.length;

    const expenses = await this.prisma.expense.findMany({
      where: {
        groupId: targetGroupId,
        deletedAt: null,
        splitType: { in: ['EQUAL', 'PERCENTAGE'] },
      },
      include: { splits: true },
    });

    const memberBalances = group.members.map((m) => {
      let paid = 0;
      let share = 0;

      for (const expense of expenses) {
        const amount = Number(expense.amount);
        if (expense.paidById === m.user.id) {
          paid += amount;
        }
        share += calculateExpenseShare(
          expense,
          m.user.id,
          memberCount,
          expense.splits,
        );
      }

      return {
        user: m.user,
        paid: Math.round(paid * 100) / 100,
        share: Math.round(share * 100) / 100,
        balance: Math.round((paid - share) * 100) / 100,
      };
    });

    const workingBalances = memberBalances.map((m) => ({
      ...m,
      balance: m.balance,
      user: m.user,
    }));

    const debtors = workingBalances
      .filter((m) => m.balance < -0.01)
      .sort((a, b) => a.balance - b.balance);

    const creditors = workingBalances
      .filter((m) => m.balance > 0.01)
      .sort((a, b) => b.balance - a.balance);

    const suggestions: {
      from: { id: string; firstName: string; lastName: string };
      to: { id: string; firstName: string; lastName: string };
      amount: number;
    }[] = [];

    let i = 0;
    let j = 0;
    while (i < debtors.length && j < creditors.length) {
      const debtor = debtors[i];
      const creditor = creditors[j];
      const amount = Math.min(Math.abs(debtor.balance), creditor.balance);

      if (amount > 0.01) {
        suggestions.push({
          from: {
            id: debtor.user.id,
            firstName: debtor.user.firstName,
            lastName: debtor.user.lastName,
          },
          to: {
            id: creditor.user.id,
            firstName: creditor.user.firstName,
            lastName: creditor.user.lastName,
          },
          amount: Math.round(amount * 100) / 100,
        });
      }

      debtor.balance += amount;
      creditor.balance -= amount;

      if (Math.abs(debtor.balance) < 0.01) i++;
      if (Math.abs(creditor.balance) < 0.01) j++;
    }

    return {
      group: { id: group.id, name: group.name },
      members: memberBalances,
      suggestions,
    };
  }
}

import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateExpenseShare } from '../common/utils/expense-share';

@Injectable()
export class SettlementsService {
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

    const couple = await this.prisma.couple.findUnique({
      where: { id: user.coupleId },
      include: {
        users: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!couple) {
      throw new NotFoundException('Couple not found');
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
      where: { coupleId: user.coupleId },
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

    const netSettlementSigned =
      signedBalance - paymentsReceived + paymentsMade;

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
}

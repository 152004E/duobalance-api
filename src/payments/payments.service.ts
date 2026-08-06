import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getDefaultGroupId(userId: string) {
    const membership = await this.prisma.groupMember.findFirst({
      where: { userId },
    });

    if (!membership) {
      throw new BadRequestException('User does not belong to any group');
    }

    return membership.groupId;
  }

  async create(userId: string, dto: CreatePaymentDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const groupId = dto.groupId ?? (await this.getDefaultGroupId(userId));

    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      throw new BadRequestException('User is not a member of this group');
    }

    if (dto.toUserId === userId) {
      throw new BadRequestException('Cannot pay yourself');
    }

    const toUser = await this.prisma.user.findUnique({
      where: { id: dto.toUserId },
    });

    if (!toUser) {
      throw new NotFoundException('Recipient user not found');
    }

    const recipientMembership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: dto.toUserId, groupId } },
    });

    if (!recipientMembership) {
      throw new ForbiddenException('Recipient is not in your group');
    }

    return this.prisma.payment.create({
      data: {
        amount: dto.amount,
        status: 'PENDING',
        fromUserId: userId,
        toUserId: dto.toUserId,
        groupId,
      },
    });
  }

  async confirm(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.toUserId !== userId) {
      throw new ForbiddenException('Only the recipient can confirm this payment');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment is not pending');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
    });
  }

  async reject(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.toUserId !== userId) {
      throw new ForbiddenException('Only the recipient can reject this payment');
    }

    if (payment.status !== 'PENDING') {
      throw new BadRequestException('Payment is not pending');
    }

    return this.prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'REJECTED',
        confirmedAt: new Date(),
      },
    });
  }

  async findAll(userId: string, groupId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const targetGroupId = groupId
      ? await this.validateMembership(userId, groupId)
      : await this.getDefaultGroupId(userId);

    return this.prisma.payment.findMany({
      where: {
        groupId: targetGroupId,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        toUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  private async validateMembership(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of this group');
    }

    return groupId;
  }
}

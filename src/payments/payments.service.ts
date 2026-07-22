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
        fromUserId: userId,
        toUserId: dto.toUserId,
        groupId,
      },
    });
  }

  async findAll(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const groupId = await this.getDefaultGroupId(userId);

    return this.prisma.payment.findMany({
      where: {
        groupId,
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
}

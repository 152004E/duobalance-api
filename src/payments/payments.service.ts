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
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(userId: string, dto: CreatePaymentDto) {
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

    if (dto.toUserId === userId) {
      throw new BadRequestException(
        'Cannot pay yourself',
      );
    }

    const toUser = await this.prisma.user.findUnique({
      where: { id: dto.toUserId },
    });

    if (!toUser) {
      throw new NotFoundException('Recipient user not found');
    }

    if (toUser.coupleId !== user.coupleId) {
      throw new ForbiddenException(
        'Recipient is not in your couple',
      );
    }

    return this.prisma.payment.create({
      data: {
        amount: dto.amount,
        fromUserId: userId,
        toUserId: dto.toUserId,
        coupleId: user.coupleId,
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

    if (!user.coupleId) {
      throw new BadRequestException(
        'User is not part of a couple',
      );
    }

    return this.prisma.payment.findMany({
      where: {
        coupleId: user.coupleId,
      },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

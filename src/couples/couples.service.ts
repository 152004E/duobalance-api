import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateInviteCode } from '../common/utils/invite-code';

@Injectable()
export class CouplesService {
  constructor(private readonly prisma: PrismaService) {}

  async createCouple(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.coupleId) {
      throw new BadRequestException(
        'User already belongs to a couple',
      );
    }

    const couple = await this.prisma.couple.create({
      data: {
        inviteCode: generateInviteCode(),
        users: {
          connect: { id: userId },
        },
      },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return couple;
  }

  async getMyCouple(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        couple: {
          include: {
            users: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!user?.couple) {
      throw new NotFoundException('User does not belong to a couple');
    }

    return user.couple;
  }

  async joinCouple(userId: string, inviteCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.coupleId) {
      throw new BadRequestException(
        'User already belongs to a couple',
      );
    }

    const couple = await this.prisma.couple.findUnique({
      where: { inviteCode },
      include: { users: true },
    });

    if (!couple) {
      throw new NotFoundException('Invalid invite code');
    }

    if (couple.users.length >= 2) {
      throw new BadRequestException(
        'Couple already has two members',
      );
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { coupleId: couple.id },
    });

    return this.prisma.couple.findUnique({
      where: { id: couple.id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
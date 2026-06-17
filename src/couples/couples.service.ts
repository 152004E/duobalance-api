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

  private readonly coupleInclude = {
    users: {
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    },
  };

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

    return this.prisma.couple.create({
      data: {
        inviteCode: generateInviteCode(),
        users: {
          connect: { id: userId },
        },
      },
      include: this.coupleInclude,
    });
  }

  async joinCouple(
    userId: string,
    inviteCode: string,
  ) {
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
      include: {
        users: true,
      },
    });

    if (!couple) {
      throw new NotFoundException(
        'Invalid invite code',
      );
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
      include: this.coupleInclude,
    });
  }

  async getMyCouple(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        coupleId: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.coupleId) {
      throw new BadRequestException(
        'User does not belong to a couple',
      );
    }

    return this.prisma.couple.findUnique({
      where: { id: user.coupleId },
      include: this.coupleInclude,
    });
  }
  async leaveCouple(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  if (!user.coupleId) {
    throw new BadRequestException(
      'User does not belong to a couple',
    );
  }

  await this.prisma.user.update({
    where: { id: userId },
    data: {
      coupleId: null,
    },
  });

  const couple = await this.prisma.couple.findUnique({
    where: {
      id: user.coupleId,
    },
    include: {
      users: true,
    },
  });

  if (couple && couple.users.length === 0) {
    await this.prisma.couple.delete({
      where: {
        id: couple.id,
      },
    });

    return {
      message: 'Couple deleted',
    };
  }

  return {
    message: 'Left couple successfully',
  };
}
}
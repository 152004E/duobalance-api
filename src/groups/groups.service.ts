import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateInviteCode } from '../common/utils/invite-code';
import { CreateGroupDto } from './dto/create-group.dto';

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly groupInclude = {
    members: {
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    },
  };

  async createGroup(userId: string, dto: CreateGroupDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.group.create({
      data: {
        name: dto.name,
        type: dto.type ?? 'COUPLE',
        inviteCode: generateInviteCode(),
        members: {
          create: { userId, role: 'OWNER' },
        },
      },
      include: this.groupInclude,
    });
  }

  async joinGroup(userId: string, inviteCode: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingMembership = await this.prisma.groupMember.findFirst({
      where: { userId, group: { inviteCode } },
    });

    if (existingMembership) {
      throw new BadRequestException('User already belongs to this group');
    }

    const group = await this.prisma.group.findUnique({
      where: { inviteCode },
      include: { members: true },
    });

    if (!group) {
      throw new NotFoundException('Invalid invite code');
    }

    if (group.type === 'PERSONAL') {
      throw new BadRequestException('Cannot join a personal group');
    }

    const role = group.type === 'COUPLE' && group.members.length < 2
      ? 'ADMIN'
      : 'MEMBER';

    await this.prisma.groupMember.create({
      data: { userId, groupId: group.id, role },
    });

    return this.prisma.group.findUnique({
      where: { id: group.id },
      include: this.groupInclude,
    });
  }

  async getMyGroups(userId: string) {
    return this.prisma.group.findMany({
      where: { members: { some: { userId } } },
      include: this.groupInclude,
    });
  }

  async getGroup(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of this group');
    }

    return this.prisma.group.findUnique({
      where: { id: groupId },
      include: this.groupInclude,
    });
  }

  async leaveGroup(userId: string, groupId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      throw new BadRequestException('User is not a member of this group');
    }

    await this.prisma.groupMember.delete({
      where: { userId_groupId: { userId, groupId } },
    });

    const remaining = await this.prisma.groupMember.count({
      where: { groupId },
    });

    if (remaining === 0) {
      await this.prisma.expenseSplit.deleteMany({
        where: { expense: { groupId } },
      });
      await this.prisma.expense.deleteMany({ where: { groupId } });
      await this.prisma.payment.deleteMany({ where: { groupId } });
      await this.prisma.group.delete({ where: { id: groupId } });

      return { message: 'Group deleted' };
    }

    return { message: 'Left group successfully' };
  }
}

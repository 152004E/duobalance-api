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

  async regenerateInviteCode(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });

    if (!membership) {
      throw new ForbiddenException('User is not a member of this group');
    }

    if (membership.role === 'MEMBER') {
      throw new ForbiddenException('Only the owner or an admin can regenerate the invite code');
    }

    if (membership.role === 'ADMIN' || membership.role === 'OWNER') {
      let newCode = generateInviteCode();
      while (true) {
        const existing = await this.prisma.group.findUnique({
          where: { inviteCode: newCode },
        });
        if (!existing) break;
        newCode = generateInviteCode();
      }

      return this.prisma.group.update({
        where: { id: groupId },
        data: { inviteCode: newCode },
        include: this.groupInclude,
      });
    }
  }

  async updateGroup(userId: string, groupId: string, dto: { name?: string }) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) throw new ForbiddenException('User is not a member of this group');
    if (membership.role === 'MEMBER') throw new ForbiddenException('Only the owner or an admin can update the group');

    return this.prisma.group.update({
      where: { id: groupId },
      data: dto,
      include: this.groupInclude,
    });
  }

  async deleteGroup(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) throw new ForbiddenException('User is not a member of this group');
    if (membership.role !== 'OWNER') throw new ForbiddenException('Only the owner can delete the group');

    await this.prisma.expenseSplit.deleteMany({
      where: { expense: { groupId } },
    });
    await this.prisma.expense.deleteMany({ where: { groupId } });
    await this.prisma.payment.deleteMany({ where: { groupId } });
    await this.prisma.groupMember.deleteMany({ where: { groupId } });
    await this.prisma.group.delete({ where: { id: groupId } });

    return { message: 'Group deleted' };
  }

  async archiveGroup(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!membership) throw new ForbiddenException('User is not a member of this group');
    if (membership.role === 'MEMBER') throw new ForbiddenException('Only the owner or an admin can archive the group');

    return this.prisma.group.update({
      where: { id: groupId },
      data: { archivedAt: new Date() },
      include: this.groupInclude,
    });
  }

  async removeMember(userId: string, groupId: string, memberId: string) {
    const requesterMembership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!requesterMembership) throw new ForbiddenException('User is not a member of this group');
    if (requesterMembership.role === 'MEMBER') throw new ForbiddenException('Only the owner or an admin can remove members');

    const target = await this.prisma.groupMember.findUnique({
      where: { id: memberId },
    });
    if (!target) throw new NotFoundException('Member not found');
    if (target.role === 'OWNER') throw new ForbiddenException('Cannot remove the owner');

    await this.prisma.expenseSplit.deleteMany({
      where: { userId: target.userId, expense: { groupId } },
    });
    await this.prisma.groupMember.delete({ where: { id: memberId } });

    return { message: 'Member removed' };
  }

  async updateMemberSplit(userId: string, groupId: string, memberId: string, percentage: number) {
    const requesterMembership = await this.prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId } },
    });
    if (!requesterMembership) throw new ForbiddenException('User is not a member of this group');
    if (requesterMembership.role === 'MEMBER') throw new ForbiddenException('Only the owner or an admin can adjust split percentages');

    const target = await this.prisma.groupMember.findUnique({
      where: { id: memberId },
    });
    if (!target) throw new NotFoundException('Member not found');

    return this.prisma.groupMember.update({
      where: { id: memberId },
      data: { splitPercentage: percentage },
      select: {
        id: true,
        role: true,
        splitPercentage: true,
        userId: true,
        groupId: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
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

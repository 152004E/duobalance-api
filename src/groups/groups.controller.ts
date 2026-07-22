import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { UpdateMemberSplitDto } from './dto/update-member-split.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('groups')
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  createGroup(@Req() req: any, @Body() dto: CreateGroupDto) {
    return this.groupsService.createGroup(req.user.id, dto);
  }

  @Post('join')
  @UseGuards(JwtAuthGuard)
  joinGroup(@Req() req: any, @Body() dto: JoinGroupDto) {
    return this.groupsService.joinGroup(req.user.id, dto.inviteCode);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  getMyGroups(@Req() req: any) {
    return this.groupsService.getMyGroups(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getGroup(@Req() req: any, @Param('id') id: string) {
    return this.groupsService.getGroup(req.user.id, id);
  }

  @Post(':id/regenerate-invite')
  @UseGuards(JwtAuthGuard)
  regenerateInviteCode(@Req() req: any, @Param('id') id: string) {
    return this.groupsService.regenerateInviteCode(req.user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  updateGroup(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.updateGroup(req.user.id, id, dto);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard)
  archiveGroup(@Req() req: any, @Param('id') id: string) {
    return this.groupsService.archiveGroup(req.user.id, id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  deleteGroup(@Req() req: any, @Param('id') id: string) {
    return this.groupsService.deleteGroup(req.user.id, id);
  }

  @Delete(':id/members/:memberId')
  @UseGuards(JwtAuthGuard)
  removeMember(
    @Req() req: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
  ) {
    return this.groupsService.removeMember(req.user.id, id, memberId);
  }

  @Patch(':id/members/:memberId/split')
  @UseGuards(JwtAuthGuard)
  updateMemberSplit(
    @Req() req: any,
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberSplitDto,
  ) {
    return this.groupsService.updateMemberSplit(
      req.user.id,
      id,
      memberId,
      dto.percentage,
    );
  }

  @Delete(':id/leave')
  @UseGuards(JwtAuthGuard)
  leaveGroup(@Req() req: any, @Param('id') id: string) {
    return this.groupsService.leaveGroup(req.user.id, id);
  }
}

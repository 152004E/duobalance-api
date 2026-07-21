import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('groups')
export class GroupsController {
    constructor(
        private readonly groupsService: GroupsService,
    ) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    createGroup(
        @Req() req: any,
        @Body() dto: CreateGroupDto,
    ) {
        return this.groupsService.createGroup(req.user.id, dto);
    }

    @Post('join')
    @UseGuards(JwtAuthGuard)
    joinGroup(
        @Req() req: any,
        @Body() dto: JoinGroupDto,
    ) {
        return this.groupsService.joinGroup(
            req.user.id,
            dto.inviteCode,
        );
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    getMyGroups(@Req() req: any) {
        return this.groupsService.getMyGroups(req.user.id);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    getGroup(
        @Req() req: any,
        @Param('id') id: string,
    ) {
        return this.groupsService.getGroup(req.user.id, id);
    }

    @Post(':id/regenerate-invite')
    @UseGuards(JwtAuthGuard)
    regenerateInviteCode(
        @Req() req: any,
        @Param('id') id: string,
    ) {
        return this.groupsService.regenerateInviteCode(
            req.user.id,
            id,
        );
    }

    @Delete(':id/leave')
    @UseGuards(JwtAuthGuard)
    leaveGroup(
        @Req() req: any,
        @Param('id') id: string,
    ) {
        return this.groupsService.leaveGroup(
            req.user.id,
            id,
        );
    }
}

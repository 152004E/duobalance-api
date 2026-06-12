import {
    Body,
    Controller,
    Delete,
    Get,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { CouplesService } from './couples.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('couples')
export class CouplesController {
    constructor(
        private readonly couplesService: CouplesService,
    ) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    createCouple(@Req() req: any) {
        return this.couplesService.createCouple(req.user.id);
    }

    @Post('join')
    @UseGuards(JwtAuthGuard)
    joinCouple(
        @Req() req: any,
        @Body('inviteCode') inviteCode: string,
    ) {
        return this.couplesService.joinCouple(
            req.user.id,
            inviteCode,
        );
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMyCouple(@Req() req: any) {
        return this.couplesService.getMyCouple(
            req.user.id,
        );
    }

    @Delete('leave')
    @UseGuards(JwtAuthGuard)
    leaveCouple(@Req() req: any) {
        return this.couplesService.leaveCouple(
            req.user.id,
        );
    }
}
import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('settlements')
export class SettlementsController {
  constructor(private readonly settlementsService: SettlementsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  calculate(@Req() req) {
    return this.settlementsService.calculate(req.user.id);
  }

  @Get('suggestions')
  @UseGuards(JwtAuthGuard)
  suggest(@Req() req, @Query('groupId') groupId?: string) {
    return this.settlementsService.suggest(req.user.id, groupId);
  }
}

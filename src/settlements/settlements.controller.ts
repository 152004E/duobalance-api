import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SettlementsService } from './settlements.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('settlements')
export class SettlementsController {
  constructor(
    private readonly settlementsService: SettlementsService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  calculate(@Req() req) {
    return this.settlementsService.calculate(req.user.id);
  }
}

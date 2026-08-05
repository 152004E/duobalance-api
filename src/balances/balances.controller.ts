import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('balances')
export class BalancesController {
  constructor(private readonly balancesService: BalancesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getBalance(@Req() req, @Query('groupId') groupId?: string) {
    return this.balancesService.calculate(req.user.id, groupId);
  }
}

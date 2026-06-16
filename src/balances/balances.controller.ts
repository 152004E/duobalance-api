import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { BalancesService } from './balances.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('balances')
export class BalancesController {
  constructor(
    private readonly balancesService: BalancesService,
  ) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  getBalance(@Req() req) {
    return this.balancesService.calculate(req.user.id);
  }
}

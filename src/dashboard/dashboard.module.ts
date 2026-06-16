import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { BalancesModule } from '../balances/balances.module';
import { SettlementsModule } from '../settlements/settlements.module';

@Module({
  imports: [BalancesModule, SettlementsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

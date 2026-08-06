import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(req.user.id, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req, @Query('groupId') groupId?: string) {
    return this.paymentsService.findAll(req.user.id, groupId);
  }

  @Post(':id/confirm')
  @UseGuards(JwtAuthGuard)
  confirm(@Req() req, @Param('id') id: string) {
    return this.paymentsService.confirm(req.user.id, id);
  }

  @Post(':id/reject')
  @UseGuards(JwtAuthGuard)
  reject(@Req() req, @Param('id') id: string) {
    return this.paymentsService.reject(req.user.id, id);
  }
}

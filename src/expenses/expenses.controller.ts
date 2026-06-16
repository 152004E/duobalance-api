import {
  Body,
  Get,
  Controller,
  Post,
  Req,
  UseGuards,
  Param,
  Patch,
} from '@nestjs/common';
import { UpdateExpenseDto } from './dto/update-expense.dto';

import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('expenses')
export class ExpensesController {
  constructor(
    private readonly expensesService: ExpensesService,
  ) { }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Req() req,
    @Body() dto: CreateExpenseDto,
  ) {
    return this.expensesService.create(
      req.user.id,
      dto,
    );
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req) {
    return this.expensesService.findAll(
      req.user.id,
    );
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Req() req,
    @Param('id') id: string,
  ) {
    return this.expensesService.findOne(
      req.user.id,
      id,
    );
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.expensesService.update(
      req.user.id,
      id,
      dto,
    );
  }
}
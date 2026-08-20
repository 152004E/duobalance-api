import {
  Body,
  Get,
  Delete,
  Controller,
  Post,
  Req,
  UseGuards,
  Param,
  Patch,
  Query,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { mkdirSync } from 'fs';
import { UpdateExpenseDto } from './dto/update-expense.dto';

import { ExpensesService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { QueryExpenseDto } from './dto/query-expense.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Req() req, @Body() dto: CreateExpenseDto) {
    return this.expensesService.create(req.user.id, dto);
  }
  @Get()
  @UseGuards(JwtAuthGuard)
  findAll(@Req() req, @Query() query: QueryExpenseDto) {
    return this.expensesService.findAll(req.user.id, query);
  }
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(@Req() req, @Param('id') id: string) {
    return this.expensesService.findOne(req.user.id, id);
  }
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(@Req() req, @Param('id') id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(req.user.id, id, dto);
  }
  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@Req() req, @Param('id') id: string) {
    return this.expensesService.remove(req.user.id, id);
  }

  @Post(':id/receipt')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req: any, _file: any, cb: any) => {
          const dir = join(process.cwd(), 'uploads', 'receipts');
          mkdirSync(dir, { recursive: true });
          cb(null, dir);
        },
        filename: (
          _req: any,
          file: { originalname: string },
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const ext = extname(file.originalname) || '.jpg';
          const name = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
          cb(null, name);
        },
      }),
      fileFilter: (
        _req: any,
        file: { mimetype: string },
        cb: (error: Error | null, acceptFile: boolean) => void,
      ) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png|gif|webp)$/)) {
          cb(
            new Error('Solo se permiten imágenes (jpg, jpeg, png, gif, webp)'),
            false,
          );
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadReceipt(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }
    const receiptUrl = `/uploads/receipts/${file.filename}`;
    return this.expensesService.setReceipt(req.user.id, id, receiptUrl);
  }

  @Delete(':id/receipt')
  @UseGuards(JwtAuthGuard)
  removeReceipt(@Req() req: any, @Param('id') id: string) {
    return this.expensesService.clearReceipt(req.user.id, id);
  }
}

import {
  IsEnum,
  IsNumber,
  IsPositive,
  IsString,
} from 'class-validator';

import { ExpenseCategory, SplitType } from '../../generated/enums';

export class CreateExpenseDto {
  @IsString()
  description: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsEnum(SplitType)
  splitType: SplitType;
}
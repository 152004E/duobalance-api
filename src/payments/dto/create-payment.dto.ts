import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsPositive, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsUUID()
  toUserId: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;
}

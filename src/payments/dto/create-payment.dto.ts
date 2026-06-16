import { Type } from 'class-transformer';
import { IsNumber, IsPositive, IsUUID } from 'class-validator';

export class CreatePaymentDto {
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsUUID()
  toUserId: string;
}

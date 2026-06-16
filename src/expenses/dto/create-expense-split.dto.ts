import { IsNumber, IsString, IsUUID, Min, Max } from 'class-validator';

export class CreateExpenseSplitDto {
  @IsString()
  @IsUUID()
  userId: string;

  @IsNumber()
  @Min(1)
  @Max(100)
  percentage: number;
}

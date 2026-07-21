import { IsNumber, Min, Max } from 'class-validator';

export class UpdateMemberSplitDto {
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

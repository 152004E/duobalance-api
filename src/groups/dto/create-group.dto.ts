import { IsEnum, IsOptional, IsString } from 'class-validator';
import { GroupType } from '../../generated/enums';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(GroupType)
  type?: GroupType;
}

import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TestMailDto {
  @IsEmail()
  @IsNotEmpty()
  to: string;

  @IsOptional()
  @IsString()
  name?: string;
}

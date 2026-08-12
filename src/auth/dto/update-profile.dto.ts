import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { IsNotDisposableEmail } from '@nestbolt/disposable-email';
import { IsRealEmail } from '../../common/validators/is-real-email';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  lastName?: string;

  @IsOptional()
  @IsEmail()
  @IsRealEmail()
  @IsNotDisposableEmail({
    message: 'Usa un correo permanente, no uno temporal.',
  })
  email?: string;
}

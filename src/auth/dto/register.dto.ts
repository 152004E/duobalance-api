import { IsEmail, IsString, MinLength } from 'class-validator';
import { IsNotDisposableEmail } from '@nestbolt/disposable-email';
import { IsRealEmail } from '../../common/validators/is-real-email';

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  @IsRealEmail()
  @IsNotDisposableEmail({
    message: 'Usa un correo permanente para registrarte, no uno temporal.',
  })
  email: string;

  @IsString()
  @MinLength(6)
  password: string;
}

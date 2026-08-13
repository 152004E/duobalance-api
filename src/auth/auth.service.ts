import {
  Injectable,
  Logger,
  UnauthorizedException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';
import { EmailVerificationService } from './email-verification.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly mailService: MailService,
  ) {}

  async register(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    const user = await this.usersService.findByEmail(data.email);

    if (user) {
      throw new ConflictException('User already exists');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const createdUser = await this.usersService.create({
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: hashedPassword,
    });

    await this.sendVerificationEmail(createdUser.id, createdUser);

    const { password, ...result } = createdUser;

    return result;
  }

  async login(data: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException(
        'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.',
      );
    }

    const payload = { id: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '2m' });
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      user.id,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 120,
    };
  }

  /**
   * Verifica el correo de un usuario con un token de un solo uso.
   */
  async verifyEmail(plainToken: string) {
    const record =
      await this.emailVerificationService.validateVerificationToken(plainToken);
    if (!record) {
      throw new UnauthorizedException(
        'El enlace de verificación es inválido o ya expiró.',
      );
    }

    await this.emailVerificationService.markUsed(record.id);
    await this.emailVerificationService.invalidateForUser(record.userId);

    const updated = await this.usersService.update(record.userId, {
      emailVerifiedAt: new Date(),
    });
    const { password, ...result } = updated;

    return result;
  }

  /**
   * Reenvía el correo de verificación. Respuesta genérica para no enumerar usuarios.
   */
  async resendVerification(email: string) {
    const user = await this.usersService.findByEmail(email);

    if (user && !user.emailVerifiedAt) {
      await this.emailVerificationService.invalidateForUser(user.id);
      await this.sendVerificationEmail(user.id, user);
    }

    return {
      message:
        'Si el correo existe y no está verificado, te enviamos un nuevo enlace.',
    };
  }

  /** Genera token y envía el correo combinado (bienvenida + verificación). No rompe el flujo si el mail falla. */
  private async sendVerificationEmail(
    userId: string,
    user: { email: string; firstName: string; lastName: string },
  ): Promise<void> {
    try {
      const token =
        await this.emailVerificationService.createVerificationToken(userId);
      await this.mailService.sendWelcomeAndVerification(
        user.email,
        `${user.firstName} ${user.lastName}`,
        token,
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el correo de verificación a ${user.email}: ${
          (error as Error).message
        }`,
      );
    }
  }

  async refresh(plainToken: string) {
    const tokenRecord =
      await this.refreshTokenService.validateRefreshToken(plainToken);
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const payload = { id: tokenRecord.user.id, email: tokenRecord.user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '2m' });
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      tokenRecord.user.id,
    );

    // Revoke the old refresh token (rotation)
    await this.refreshTokenService.revokeRefreshToken(plainToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 120,
    };
  }

  async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string },
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const isMatch = await bcrypt.compare(data.currentPassword, user.password);
    if (!isMatch)
      throw new UnauthorizedException('La contraseña actual no es correcta');

    const hashedPassword = await bcrypt.hash(data.newPassword, 10);
    await this.usersService.update(userId, { password: hashedPassword });
    return { message: 'Contraseña actualizada correctamente' };
  }

  async logout(plainToken: string) {
    await this.refreshTokenService.revokeRefreshToken(plainToken);
    return { success: true };
  }

  async updateProfile(
    userId: string,
    data: { firstName?: string; lastName?: string; email?: string },
  ) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    if (data.email && data.email !== user.email) {
      const emailExists = await this.usersService.findByEmail(data.email);
      if (emailExists) throw new ConflictException('El correo ya está en uso');
    }

    const updated = await this.usersService.update(userId, data);
    const { password, ...result } = updated;
    return result;
  }

  async updateAvatar(userId: string, avatarUrl: string) {
    const user = await this.usersService.findById(userId);
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const updated = await this.usersService.update(userId, { avatarUrl });
    const { password, ...result } = updated;
    return result;
  }
}

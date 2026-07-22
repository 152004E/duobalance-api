import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
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

    const { password, ...result } = createdUser;

    return result;
  }

  async login(data: { email: string; password: string }) {
    const user = await this.usersService.findByEmail(data.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isMatch = await bcrypt.compare(data.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const payload = { id: user.id, email: user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      user.id,
    );

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
    };
  }

  async refresh(plainToken: string) {
    const tokenRecord =
      await this.refreshTokenService.validateRefreshToken(plainToken);
    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const payload = { id: tokenRecord.user.id, email: tokenRecord.user.email };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = await this.refreshTokenService.createRefreshToken(
      tokenRecord.user.id,
    );

    // Revoke the old refresh token (rotation)
    await this.refreshTokenService.revokeRefreshToken(plainToken);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 900,
    };
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

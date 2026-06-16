import {
    Injectable,
    UnauthorizedException,
    ConflictException,
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
    ) { }

    async register(data: { name: string; email: string; password: string }) {
        const user = await this.usersService.findByEmail(data.email);

        if (user) {
            throw new ConflictException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        const createdUser = await this.usersService.create({
            name: data.name,
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
        const refreshToken = await this.refreshTokenService.createRefreshToken(user.id);

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 900,
        };
    }

    async refresh(plainToken: string) {
        const tokenRecord = await this.refreshTokenService.validateRefreshToken(plainToken);
        if (!tokenRecord) {
            throw new UnauthorizedException('Invalid or expired refresh token');
        }

        const payload = { id: tokenRecord.user.id, email: tokenRecord.user.email };
        const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
        const refreshToken = await this.refreshTokenService.createRefreshToken(tokenRecord.user.id);

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
}

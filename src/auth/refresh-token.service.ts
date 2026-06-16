import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class RefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Hashes a plain text token using SHA-256.
   */
  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates a new cryptographically secure random refresh token,
   * hashes it, and stores it in the database.
   * Returns the unhashed (plain text) token.
   */
  async createRefreshToken(userId: string): Promise<string> {
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(plainToken);
    
    // Expires in 7 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    });

    return plainToken;
  }

  /**
   * Finds a refresh token by its plain text value and checks if it is valid.
   * If it is valid, returns the record including the user. Otherwise, returns null.
   */
  async validateRefreshToken(plainToken: string) {
    const tokenHash = this.hashToken(plainToken);
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!refreshToken) {
      return null;
    }

    const isExpired = new Date() > refreshToken.expiresAt;
    if (isExpired) {
      // Clean up expired token from database
      await this.revokeRefreshToken(plainToken);
      return null;
    }

    return refreshToken;
  }

  /**
   * Revokes (deletes) a refresh token from the database by its plain text value.
   */
  async revokeRefreshToken(plainToken: string): Promise<void> {
    const tokenHash = this.hashToken(plainToken);
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash },
    });
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000; // 24 horas

@Injectable()
export class EmailVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Genera un token de verificación, lo guarda hasheado y devuelve el token en claro.
   */
  async createVerificationToken(userId: string): Promise<string> {
    const plainToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(plainToken);
    const expiresAt = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

    await this.prisma.emailVerificationToken.create({
      data: { tokenHash, userId, expiresAt },
    });

    return plainToken;
  }

  /**
   * Valida un token en claro: debe existir, no estar usado y no estar expirado.
   * Devuelve el registro con el usuario incluido, o null.
   */
  async validateVerificationToken(plainToken: string) {
    const tokenHash = this.hashToken(plainToken);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record) return null;

    if (record.usedAt || record.expiresAt < new Date()) {
      return null;
    }

    return record;
  }

  /** Marca un token como usado. */
  async markUsed(tokenId: string): Promise<void> {
    await this.prisma.emailVerificationToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  }

  /** Invalida todos los tokens pendientes de un usuario (al reenviar o al verificar). */
  async invalidateForUser(userId: string): Promise<void> {
    await this.prisma.emailVerificationToken.deleteMany({
      where: { userId, usedAt: null },
    });
  }
}

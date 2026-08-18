import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { MailPayload, SentMailResult } from './interfaces/mail.interface';
import {
  MAIL_PROVIDER_TOKEN,
  MailProvider,
} from './interfaces/mail-provider.interface';

/**
 * Única puerta de salida de correos. Ningún otro módulo envía correos directamente.
 */
@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_PROVIDER_TOKEN)
    private readonly provider: MailProvider,
    private readonly config: ConfigService,
  ) {}

  private get from(): string {
    return this.config.get<string>('MAIL_FROM') ?? 'onboarding@resend.dev';
  }

  private get frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:8081';
  }

  async send(payload: MailPayload): Promise<SentMailResult> {
    const html = await this.renderTemplate(payload.template, payload.data);
    return this.provider.send({
      from: this.from,
      to: payload.to,
      subject: payload.subject,
      html,
    });
  }

  /** Correo de prueba para validar la integración (endpoint temporal POST /mail/test). */
  sendTest(to: string, name: string): Promise<SentMailResult> {
    return this.send({
      to,
      subject: 'DuoBalance — Bienvenido y activación de tu cuenta',
      template: 'welcome',
      data: { name, url: this.verificationUrl('/') },
    });
  }

  /**
   * Correo combinado de bienvenida + verificación de correo.
   * Lleva el botón "Confirmar tu correo" que apunta a /verify-email?token=...
   */
  sendWelcomeAndVerification(
    to: string,
    name: string,
    token: string,
  ): Promise<SentMailResult> {
    return this.send({
      to,
      subject: 'DuoBalance — Confirma tu correo',
      template: 'welcome',
      data: { name, url: this.verificationUrl(token) },
    });
  }

  private verificationUrl(token: string): string {
    return `${this.frontendUrl}/verify-email?token=${token}`;
  }

  private async renderTemplate(
    template: string,
    data: Record<string, string | number>,
  ): Promise<string> {
    // Dev: lee de src/. En producción (dist/) habrá que copiar templates al build.
    const filePath = join(
      process.cwd(),
      'src',
      'mail',
      'templates',
      `${template}.html`,
    );
    let html = await readFile(filePath, 'utf-8');
    for (const [key, value] of Object.entries(data)) {
      html = html.replaceAll(`{{${key}}}`, String(value));
    }
    return html;
  }
}

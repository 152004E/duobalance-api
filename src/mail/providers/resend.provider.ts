import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

export interface ResendSendPayload {
  from: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Único archivo que importa el SDK de Resend.
 * Si en el futuro se cambia de proveedor (Brevo, SMTP...), solo se toca esta clase.
 */
@Injectable()
export class ResendProvider {
  private readonly logger = new Logger(ResendProvider.name);
  private readonly client: Resend | null;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'RESEND_API_KEY no está configurada. Los correos no se enviarán.',
      );
      this.client = null;
    } else {
      this.client = new Resend(apiKey);
    }
  }

  async send(payload: ResendSendPayload): Promise<{ id?: string }> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Mail no configurado: falta RESEND_API_KEY',
      );
    }

    const { data, error } = await this.client.emails.send({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
    });

    if (error) {
      throw new Error(`Resend error: ${error.message}`);
    }

    return { id: data?.id };
  }
}

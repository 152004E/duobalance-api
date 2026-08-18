import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BrevoClient } from '@getbrevo/brevo';
import {
  MailProvider,
  MailSendOptions,
} from '../interfaces/mail-provider.interface';

@Injectable()
export class BrevoProvider implements MailProvider {
  private readonly logger = new Logger(BrevoProvider.name);
  private readonly client: BrevoClient | null;

  constructor(config: ConfigService) {
    const apiKey = config.get<string>('BREVO_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        'BREVO_API_KEY no está configurada. Los correos no se enviarán con Brevo.',
      );
      this.client = null;
      return;
    }

    this.client = new BrevoClient({ apiKey });
  }

  async send(payload: MailSendOptions): Promise<{ id?: string }> {
    if (!this.client) {
      throw new ServiceUnavailableException(
        'Mail no configurado: falta BREVO_API_KEY',
      );
    }

    const response = await this.client.transactionalEmails.sendTransacEmail({
      sender: {
        email: payload.from,
        name: 'DuoBalance',
      },
      to: [
        {
          email: payload.to,
        },
      ],
      subject: payload.subject,
      htmlContent: payload.html,
    });

    return { id: response.messageId };
  }
}
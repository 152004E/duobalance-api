import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { ResendProvider } from './providers/resend.provider';
import { MailController } from './mail.controller';
import { BrevoProvider } from './providers/brevo.provider';
import { MAIL_PROVIDER_TOKEN } from './interfaces/mail-provider.interface';

@Global()
@Module({
  controllers: [MailController],
  providers: [
    MailService,
    ResendProvider,
    BrevoProvider,
    {
      provide: MAIL_PROVIDER_TOKEN,
      inject: [ConfigService, ResendProvider, BrevoProvider],
      useFactory: (
        configService: ConfigService,
        resendProvider: ResendProvider,
        brevoProvider: BrevoProvider,
      ) => {
        return configService.get<string>('MAIL_PROVIDER') === 'brevo'
          ? brevoProvider
          : resendProvider;
      },
    },
  ],
  exports: [MailService],
})
export class MailModule {}

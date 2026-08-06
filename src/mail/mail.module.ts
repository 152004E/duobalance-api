import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ResendProvider } from './providers/resend.provider';
import { MailController } from './mail.controller';

@Global()
@Module({
  controllers: [MailController],
  providers: [MailService, ResendProvider],
  exports: [MailService, ResendProvider],
})
export class MailModule {}

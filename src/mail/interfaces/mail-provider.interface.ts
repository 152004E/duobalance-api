import { SentMailResult } from './mail.interface';

export const MAIL_PROVIDER_TOKEN = Symbol('MAIL_PROVIDER_TOKEN');

export interface MailSendOptions {
  from: string;
  to: string;
  subject: string;
  html: string;
}

export interface MailProvider {
  send(options: MailSendOptions): Promise<SentMailResult>;
}

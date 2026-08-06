export interface MailPayload {
  to: string;
  subject: string;
  /** Nombre del template en src/mail/templates/ (sin extensión .html) */
  template: string;
  /** Variables reemplazadas en el template ({{key}} → value) */
  data: Record<string, string | number>;
}

export interface SentMailResult {
  id?: string;
}

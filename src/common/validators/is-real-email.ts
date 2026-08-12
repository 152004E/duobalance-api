import { promises as dns } from 'node:dns';
import {
  isEmail,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const TRANSIENT_DNS_CODES = new Set([
  'EAI_AGAIN',
  'ETIMEOUT',
  'ENETUNREACH',
  'ECONNREFUSED',
  'ESERVFAIL',
  'CANCELLED',
]);

export function IsRealEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isRealEmail',
      target: object.constructor,
      propertyName,
      constraints: [],
      options: validationOptions,
      validator: IsRealEmailConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isRealEmail', async: true })
export class IsRealEmailConstraint implements ValidatorConstraintInterface {
  private readonly mxCache = new Map<string, boolean>();

  async validate(value: unknown): Promise<boolean> {
    if (typeof value !== 'string' || !value.trim()) {
      return false;
    }

    const email = value.trim().toLowerCase();

    if (!isEmail(email, { require_tld: true })) {
      return false;
    }

    const [localPart, domain] = email.split('@');

    if (!localPart || localPart.length < 2 || !domain) {
      return false;
    }

    return this.hasMxRecords(domain);
  }

  defaultMessage(): string {
    return 'El dominio de este correo no puede recibir mensajes. Usa un email válido.';
  }

  private async hasMxRecords(domain: string): Promise<boolean> {
    if (this.mxCache.has(domain)) {
      return this.mxCache.get(domain) as boolean;
    }

    let result = false;

    try {
      const records = await dns.resolveMx(domain);
      result = records.length > 0;
    } catch (error: unknown) {
      const code = (error as NodeJS.ErrnoException)?.code;

      if (code === 'ENOTFOUND' || code === 'ENODATA' || code === 'NXDOMAIN') {
        result = false;
      } else if (TRANSIENT_DNS_CODES.has(code as string)) {
        result = true;
      } else {
        result = true;
      }
    }

    this.mxCache.set(domain, result);
    return result;
  }
}

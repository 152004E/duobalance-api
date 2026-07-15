import { randomBytes } from 'node:crypto';

export function generateInviteCode(): string {
  return randomBytes(3).toString('hex').toUpperCase();
}

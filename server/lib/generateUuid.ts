import crypto from 'crypto';

export default function generateUuid(): string {
  return crypto.randomBytes(16).toString('base64');
}

import crypto from 'crypto';

export default function generateUuid(encoding = 'base64url' as BufferEncoding): string {
  return crypto.randomBytes(16).toString(encoding);
}

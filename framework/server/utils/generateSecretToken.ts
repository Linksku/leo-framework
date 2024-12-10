import crypto from 'crypto';
import baseX from 'base-x';

import { forbiddenSubStrs } from 'consts/unsafeWords';

const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const base62 = baseX(BASE62);

// For invite tokens etc
export default function generateSecretToken(
  bytes = 16,
  checkForbiddenSubStrs = true,
): string {
  if (!checkForbiddenSubStrs) {
    return base62.encode(crypto.randomBytes(bytes));
  }

  let token: string | null = null;
  while (!token) {
    token = base62.encode(crypto.randomBytes(bytes));
    for (const subStr of forbiddenSubStrs) {
      if (token.toLowerCase().includes(subStr)) {
        token = null;
        break;
      }
    }
  }
  return token;
}

let memo: boolean | null = null;

const BOTS_REGEX = /bot|crawler|crawling|spider|facebookexternalhit|slurp/i;

export default function isBot(ua?: Nullish<string>): boolean {
  if (typeof window !== 'undefined' && memo !== null) {
    return memo;
  }
  const hasArg = !!ua;
  if (!ua) {
    if (typeof window === 'undefined') {
      return false;
    }

    ua = window.navigator.userAgent.toLowerCase();
  }

  const result = BOTS_REGEX.test(ua.toLowerCase());
  if (!hasArg) {
    memo = result;
  }
  return result;
}

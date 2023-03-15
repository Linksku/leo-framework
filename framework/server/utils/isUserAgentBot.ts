const BOTS_REGEX = /bot|crawler|crawling|spider|facebookexternalhit|slurp/i;

export default function isUserAgentBot(userAgent: string) {
  return BOTS_REGEX.test(userAgent);
}

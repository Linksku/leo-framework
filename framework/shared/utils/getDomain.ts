export default function getDomain(url: string, excludeSubdomains = false): string | null {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return null;
  }

  const domain = url.split('/')[2];
  const parts = domain.split('.');
  if (!parts.length) {
    return null;
  }
  return excludeSubdomains
    ? parts.slice(-2).join('.')
    : domain;
}

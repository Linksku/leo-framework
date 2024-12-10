import crypto from 'crypto';

import { ASSETS_URL_ABSOLUTE } from 'consts/server';

export function getOrigUrlFromProxy(proxyUrl: string): string {
  if (!proxyUrl.startsWith(`${ASSETS_URL_ABSOLUTE}/img?`)) {
    return proxyUrl;
  }

  const queryStr = proxyUrl.slice(`${ASSETS_URL_ABSOLUTE}/img?`.length);
  const query = new URLSearchParams(queryStr);
  return query.get('url') ?? proxyUrl;
}

export default function getImgProxyUrl(url: string): string {
  const hash = crypto
    .createHash('md5')
    .update(url)
    .digest('base64url');
  return `${ASSETS_URL_ABSOLUTE}/img?url=${encodeURIComponent(url)}&hash=${hash}`;
}

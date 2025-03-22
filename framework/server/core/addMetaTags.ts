import { encode } from 'html-entities';

import { routeToMetaTags } from 'config/functions';
import isBot from 'utils/isBot';
import { APP_NAME, DESCRIPTION } from 'config';
import { HOME_URL } from 'consts/server';

export default async function addMetaTags(req: ExpressRequest, html: string) {
  // Add meta tags for index because CF caches it
  if (req.path !== '' && req.path !== '/'
    && (req.headers.cookie?.includes('authToken=')
    || !req.headers['user-agent']
    || !isBot(req.headers['user-agent']))) {
    return html;
  }

  let metaTags: ObjectOf<string | null> | null = null;
  try {
    metaTags = await routeToMetaTags(req);
  } catch {}

  if (!metaTags) {
    metaTags = {};
  }
  if (!metaTags['og:title']) {
    metaTags['og:title'] = APP_NAME;
  }
  if (!metaTags['og:image']) {
    metaTags['og:image'] = '/icon-android512.png';
  }
  if (!metaTags.description) {
    metaTags.description = DESCRIPTION;
  }

  const metaTagsArr = Object.entries(metaTags).filter(pair => pair[1]);
  if (!metaTagsArr.length) {
    return html;
  }
  const metaTagsHtml = metaTagsArr
    .filter(pair => pair[1] != null)
    .map(pair => {
      if (pair[0] === 'canonical') {
        return `<link rel="canonical" href="${HOME_URL}${encode(pair[1])}" />`;
      }
      return `<meta ${pair[0].includes(':') ? 'property' : 'name'}="${encode(pair[0])}" content="${encode(pair[1])}"/>`;
    })
    .join('\n');

  // todo: low/mid use EJS instead of injecting before </head>
  if (!process.env.PRODUCTION && (html.match(/<\/head>/g)?.length ?? 0) > 1) {
    throw new Error('addMetaTags: multiple "</head>" found');
  }
  const headEndIndex = html.indexOf('</head>');
  return `${html.slice(0, headEndIndex)}
${metaTagsHtml}
${html.slice(headEndIndex)}`;
}

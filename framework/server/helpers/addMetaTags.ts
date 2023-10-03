import { encode } from 'html-entities';

import routeToMetaTags from 'config/routeToMetaTags';
import isUserAgentBot from 'utils/isUserAgentBot';

export default async function addMetaTags(req: ExpressRequest, html: string) {
  if (req.cookies?.authToken
    || !req.headers['user-agent']
    || !isUserAgentBot(req.headers['user-agent'])) {
    return html;
  }

  let metaTags: ObjectOf<string | null> | null = null;
  try {
    metaTags = await routeToMetaTags(req.path);
  } catch {}
  if (!metaTags) {
    return html;
  }
  const metaTagsArr = Object.entries(metaTags).filter(pair => pair[1]);
  if (!metaTagsArr.length) {
    return html;
  }
  const metaTagsHtml = metaTagsArr
    .map(pair => `<meta property="${encode(pair[0])}" content="${encode(pair[1])}"/>`)
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

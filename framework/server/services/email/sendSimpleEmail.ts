import ejs, { TemplateFunction } from 'ejs';

import { APP_NAME } from 'config/config';
import sendEmail from './sendEmail';

let template: TemplateFunction | null = null;

export default async function sendSimpleEmail({
  to,
  subject,
  body,
  signature,
  unsubUrl,
  unsubText,
}: {
  to: string,
  subject: string,
  body: (
    | string
    | { url: string, text?: string }
    | (string | { url: string, text?: string })[]
  )[],
  signature?: string,
  unsubUrl: string,
  unsubText: string,
}) {
  if (!template) {
    const templateStr = await import('templates/email/simple.ejs');
    template = ejs.compile(templateStr.default);
  }

  const contentPlain = `${body.map(line => {
    if (typeof line === 'string') {
      return line;
    }
    if (!Array.isArray(line)) {
      return line.text ? `${line.text}: ${line.url}` : line.url;
    }
    return line.map(item => {
      if (typeof item === 'string') {
        return item;
      }
      return item.text ? `${item.text} (${item.url})` : item.url;
    }).join('');
  }).join('\n\n')}

${signature ?? APP_NAME}

${unsubText}: ${unsubUrl}
`;
  const contentHtml = template({
    body,
    signature: signature ?? APP_NAME,
    unsubUrl,
    unsubText,
  });

  await sendEmail(
    to,
    subject,
    contentPlain,
    contentHtml,
  );
}

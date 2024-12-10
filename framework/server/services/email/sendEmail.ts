// SES is the cheapest, may need a separate service for promotional emails for more features.
import type SESType from 'aws-sdk/clients/ses.js';

import { APP_NAME, NOREPLY_EMAIL } from 'config';
import { DELETED_USER_EMAIL_DOMAIN } from 'consts/coreUsers';

if (!process.env.AWS_ACCESS_ID) {
  throw new Error('sendEmail: AWS_ACCESS_ID env var not set.');
}

let client: SESType | null;
let clientPromise: Promise<SESType> | null = null;

export default async function sendEmail(
  toAddress: string,
  subject: string,
  contentPlain: string,
  contentHtml: string,
) {
  if (!client) {
    clientPromise ??= import('aws-sdk/clients/ses.js')
      .then(({ default: SESClient }) => new SESClient({
        accessKeyId: process.env.AWS_ACCESS_ID,
        secretAccessKey: process.env.AWS_SECRET_KEY,
        region: process.env.AWS_REGION,
      }));
    client = await clientPromise;
  }

  if (toAddress.endsWith(`@${DELETED_USER_EMAIL_DOMAIN}`)) {
    ErrorLogger.warn(new Error(`sendEmail: sending email to deleted user ${toAddress}`));
  }

  const params = {
    Destination: {
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Text: {
          Charset: 'UTF-8',
          Data: contentPlain,
        },
        Html: {
          Charset: 'UTF-8',
          Data: contentHtml,
        },
      },
      Subject: {
        Charset: 'UTF-8',
        Data: subject,
      },
    },
    Source: `${APP_NAME} <${NOREPLY_EMAIL}>`,
    ReplyToAddresses: [
      NOREPLY_EMAIL,
    ],
  } satisfies SESType.Types.SendEmailRequest;

  return client.sendEmail(params).promise();
}

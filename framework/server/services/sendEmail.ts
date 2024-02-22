import SES from 'aws-sdk/clients/ses.js';

import { NOREPLY_EMAIL } from 'config';
import { DELETED_USER_EMAIL_DOMAIN } from 'consts/coreUsers';

if (!process.env.AWS_ACCESS_ID) {
  throw new Error('sendEmail: AWS_ACCESS_ID env var not set.');
}

// SES is the cheapest, may need a separate service for promotional emails for more features.
const client = new SES({
  accessKeyId: process.env.AWS_ACCESS_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  region: process.env.AWS_REGION,
});

// todo: mid/mid block emails
export default async function sendEmail(
  toAddress: string,
  subject: string,
  contentPlain: string,
  contentHtml: string,
) {
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
    Source: NOREPLY_EMAIL,
    ReplyToAddresses: [
      NOREPLY_EMAIL,
    ],
  };

  return client.sendEmail(params).promise();
}

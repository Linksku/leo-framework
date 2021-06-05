import AWS from 'aws-sdk/global';
import SES from 'aws-sdk/clients/ses';

import { NOREPLY_EMAIL } from 'serverSettings';

AWS.config.update({ region: process.env.AWS_REGION });

// todo: find another service to send emails
const client = new SES({
  accessKeyId: process.env.AWS_ACCESS_ID,
  secretAccessKey: process.env.AWS_SECRET_KEY,
});

export default async function sendEmail(
  toAddress: string,
  subject: string,
  content: string,
) {
  const params = {
    Destination: {
      ToAddresses: [toAddress],
    },
    Message: {
      Body: {
        Html: {
          Charset: 'UTF-8',
          Data: content,
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

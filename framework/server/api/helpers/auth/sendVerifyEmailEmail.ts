import { encode } from 'html-entities';

import { signJwt } from 'api/helpers/auth/jwt';
import consumeRateLimit from 'services/consumeRateLimit';
import sendEmail from 'services/sendEmail';
import { APP_NAME } from 'config';
import { HOME_URL } from 'consts/server';

export default async function sendVerifyEmailEmail(
  user: UserModel,
  silentRateLimit = false,
): Promise<void> {
  try {
    await consumeRateLimit({
      type: 'sendVerifyEmailEmail',
      duration: 60,
      maxCount: 1,
      errMsg: 'Sent email verification email recently.',
      key: user.id,
    });
  } catch (err) {
    if (silentRateLimit) {
      return;
    }
    throw err;
  }

  const token = await signJwt(
    'verifyEmail',
    {
      userId: user.id,
      email: user.email,
    },
    { expiresIn: '1d' },
  );
  const url = `${HOME_URL}/verifyemail?token=${token}`;
  await sendEmail(
    user.email,
    `[${APP_NAME}] Verify your email`,
    `
Hi ${user.name},

Please visit this link to verify your email and finish setting up your account:
${url}

This link will expire in 1 day.

${APP_NAME}
`,
    `
<p>Hi ${encode(user.name)},</p>
<p>Please visit this link to verify your email and finish setting up your account:</p>
<p><a href="${url}">${url}</a></p>
<p>This link will expire in 1 day.</p>
<p>${APP_NAME}</p>
`,
  );
}

import { signJwt } from 'core/jwt';
import consumeRateLimit from 'services/redis/consumeRateLimit';
import { APP_NAME } from 'config';
import { HOME_URL } from 'consts/server';
import sendSimpleEmail from 'services/email/sendSimpleEmail';

export default async function sendVerifyEmailEmail(
  user: UserModel,
  silentRateLimit = false,
): Promise<void> {
  try {
    await consumeRateLimit({
      type: 'sendVerifyEmailEmail',
      errMsg: 'Sent email verification email recently.',
      key: user.id,
    });
  } catch (err) {
    if (silentRateLimit) {
      return;
    }
    throw err;
  }

  const verifyToken = await signJwt(
    'verifyEmail',
    {
      userId: user.id,
      email: user.email,
    },
    { expiresIn: '1d' },
  );
  const url = `${HOME_URL}/verifyemail?token=${verifyToken}`;
  const notifUrl = `${HOME_URL}/notifsettings`;
  await sendSimpleEmail({
    to: user.email,
    subject: `[${APP_NAME}] Verify your email`,
    body: [
      `Hi ${user.name},`,
      'Please visit this link to verify your email and finish setting up your account:',
      { url },
      'This link will expire in 1 day.',
    ],
    unsubUrl: notifUrl,
    unsubText: 'Notification settings',
  });
}

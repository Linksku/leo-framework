import { isSupported, getMessaging, getToken } from 'firebase/messaging';

import { FIREBASE_WEB_PUSH_KEY } from 'config';
import 'services/firebase';

export default async function registerSwPushNotifs(
  registration: ServiceWorkerRegistration | null,
): Promise<string | null> {
  if (!registration
    || !window.Notification
    || !await isSupported()) {
    return null;
  }

  // Firebase also asks for permission, but throws if it fails
  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') {
    // todo: low/mid warn if notif was rejected and add way to retry
    return null;
  }

  const messaging = getMessaging();
  const currentToken = await getToken(messaging, {
    vapidKey: FIREBASE_WEB_PUSH_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!currentToken) {
    throw new Error('Failed to register push notifications.');
  } else if (!process.env.PRODUCTION) {
    // eslint-disable-next-line no-console
    console.log(`FCM token: ${currentToken}`);
  }
  return currentToken;
}

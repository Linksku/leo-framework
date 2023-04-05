import { getMessaging, getToken } from 'firebase/messaging';

import 'services/firebase';

export default async function registerPushNotifs(
  registration: ServiceWorkerRegistration | null,
): Promise<string | null> {
  if (!registration || !navigator.serviceWorker) {
    return null;
  }

  // Firebase also asks for permission, but throws if it fails
  if (window.Notification) {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return null;
    }
  }

  const messaging = getMessaging();
  const currentToken = await getToken(messaging, {
    vapidKey: process.env.FIREBASE_WEB_PUSH_KEY,
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

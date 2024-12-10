/// <reference lib="webworker" />

import { isSupported, getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

import type { FcmNotifData } from 'consts/notifs';
import 'services/firebase';
import getFcmBroadcastChannel from 'services/getFcmBroadcastChannel';
import detectPlatform from 'utils/detectPlatform';

declare const self: ServiceWorkerGlobalScope;

export default async function handleSwBackgroundMessage() {
  if (detectPlatform().isNative) {
    return;
  }

  if (process.env.SERVER !== 'production') {
    self.addEventListener('notificationclick', event => {
      event.notification.close();
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      self.clients.openWindow(event.notification.data.path);
    });
  }

  // Should run before any await to prevent addEventListener warning
  const messaging = getMessaging();
  if (!await isSupported()) {
    return;
  }

  onBackgroundMessage(messaging, payload => {
    // eslint-disable-next-line no-console
    console.log('FCM payload:', payload.data);

    if (!payload.data || !payload.data.title || !payload.data.path || !payload.data.apiData) {
      return;
    }

    const data = payload.data as FcmNotifData;
    getFcmBroadcastChannel().postMessage(data.apiData);

    if (process.env.SERVER === 'production') {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      self.registration.showNotification(
        data.title,
        {
          data: {
            path: data.path,
          },
        },
      );
    }
  });
}

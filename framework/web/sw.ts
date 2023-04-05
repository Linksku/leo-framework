import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

import 'services/firebase';
import safeParseJson from 'utils/safeParseJson';
import FcmBroadcastChannel from 'services/FcmBroadcastChannel';

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', () => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  self.skipWaiting();
});

if (process.env.SERVER !== 'production') {
  self.addEventListener('notificationclick', event => {
    event.notification.close();
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    self.clients.openWindow(event.notification.data.path);
  });
}

const messaging = getMessaging();
onBackgroundMessage(messaging, payload => {
  // eslint-disable-next-line no-console
  console.log('FCM bg message:', JSON.parse(JSON.stringify(payload)));

  const dataStr = payload.data?.data;
  if (!dataStr) {
    return;
  }

  FcmBroadcastChannel.postMessage(dataStr);

  if (process.env.SERVER !== 'production') {
    const data = safeParseJson<{
      data: {
        title: string,
        path: string,
      },
    }>(
      dataStr,
      val => val && val.data && val.data.title && val.data.path,
    );
    if (data) {
      const { title, path } = data.data;
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      self.registration.showNotification(
        title,
        {
          data: { path },
        },
      );
    }
  }
});

export {};

/// <reference lib="webworker" />

import handleSwBackgroundMessage from 'core/sw/handleSwBackgroundMessage';

declare const self: ServiceWorkerGlobalScope;

self.addEventListener('install', () => {
  // eslint-disable-next-line @typescript-eslint/no-floating-promises
  self.skipWaiting();
});

// eslint-disable-next-line @typescript-eslint/no-floating-promises
handleSwBackgroundMessage();

export {};

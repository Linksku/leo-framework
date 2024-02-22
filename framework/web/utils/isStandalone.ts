import { Capacitor } from '@capacitor/core';

let cache: boolean | undefined;

export default function isStandalone() {
  if (cache == null) {
    cache = !Capacitor.isNativePlatform()
      && typeof window !== 'undefined'
      && window.matchMedia('(display-mode: standalone)').matches;
  }
  return cache;
}

import { Device } from '@capacitor/device';

import generateUuid4 from 'utils/generateUuid4';

export default async function getDeviceId(): Promise<string> {
  try {
    return (await Device.getId()).identifier;
  } catch {}

  // From https://github.com/ionic-team/capacitor-plugins/blob/main/device/src/web.ts
  // In case Device.getId() fails
  let uid = window.localStorage.getItem('_capuid');
  if (uid) {
    return uid;
  }

  uid = generateUuid4();
  window.localStorage.setItem('_capuid', uid);
  return uid;
}

import { App } from '@capacitor/app';

import detectPlatform from 'utils/detectPlatform';

export default async function getExtraApiProps() {
  let appVersion: string | undefined;
  try {
    const appInfo = detectPlatform().isNative
      ? await App.getInfo()
      : null;
    appVersion = appInfo?.version;
  } catch {}

  const props: {
    ver: string,
    platform: PlatformType,
    appVersion?: string,
  } = {
    ver: process.env.JS_VERSION,
    platform: detectPlatform().type,
  };
  if (appVersion) {
    props.appVersion = appVersion;
  }
  return props;
}

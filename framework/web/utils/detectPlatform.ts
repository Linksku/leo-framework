import { Capacitor } from '@capacitor/core';

import getOsFromUa from 'utils/getOsFromUa';
import isStandalone from 'utils/isStandalone';

type RetType = {
  type: PlatformType,
  os: OSType,
  isNative: boolean,
  isStandalone: boolean,
};

let cache: Stable<RetType> | undefined;

function _detectPlatform(): RetType {
  if (Capacitor.isNativePlatform()) {
    const capPlatform = Capacitor.getPlatform();
    return {
      type: capPlatform === 'ios'
        ? 'ios-native'
        : (capPlatform === 'android' ? 'android-native' : 'other-native'),
      os: capPlatform === 'android' || capPlatform === 'ios' ? capPlatform : 'other',
      isNative: true,
      isStandalone: false,
    };
  }

  const os = getOsFromUa();
  const standalone = isStandalone();
  let type: PlatformType;
  if (os === 'android') {
    type = standalone ? 'android-standalone' : 'android-web';
  } else if (os === 'ios') {
    type = standalone ? 'ios-standalone' : 'ios-web';
  } else if (os === 'windows' || os === 'osx' || os === 'linux') {
    type = 'desktop-web';
  } else {
    type = 'other-web';
  }
  return {
    type,
    os,
    isNative: false,
    isStandalone: standalone,
  };
}

export default function detectPlatform(): Stable<RetType> {
  if (!cache) {
    cache = markStable(_detectPlatform());
  }

  return cache;
}

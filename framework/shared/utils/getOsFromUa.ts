let navigatorOs: OSType | null = null;

export default function getOsFromUa(userAgent?: Nullish<string>): OSType {
  if (typeof window !== 'undefined' && navigatorOs) {
    return navigatorOs;
  }
  const hasArg = !!userAgent;
  if (!userAgent) {
    if (typeof window === 'undefined') {
      return 'unknown';
    }

    userAgent = window.navigator.userAgent.toLowerCase();
  }

  const ua = userAgent.toLowerCase();
  let os: OSType;
  if (ua.includes('android')) {
    os = 'android';
  } else if (ua.includes('ipad') || ua.includes('iphone') || ua.includes('ipod')) {
    os = 'ios';
  } else if (ua.includes('mobile') || ua.includes('windows phone') || ua.includes('blackberry')) {
    os = 'mobile';
  } else if (ua.includes('windows')) {
    os = 'windows';
  } else if (ua.includes(' os x')) {
    os = 'osx';
  } else if (ua.includes('linux')) {
    os = 'linux';
  } else {
    os = 'other';
  }

  if (!hasArg) {
    navigatorOs = os;
  }
  return os;
}

let os: OSTypes | null = null;

export default function detectOs(userAgent: Nullish<string>): OSTypes {
  if (!userAgent) {
    return 'unknown';
  }

  if (typeof window !== 'undefined' && os) {
    return os;
  }

  const ua = userAgent.toLowerCase();
  if (ua.includes('android')) {
    os = 'android';
  } else if (ua.includes('ipad') || ua.includes('iphone') || ua.includes('ipod')) {
    os = 'ios';
  } else if (ua.includes('mobile') || ua.includes('windows phone') || ua.includes('blackberry')) {
    os = 'mobile';
  } else if (ua.includes('windows')) {
    os = 'windows';
  } else if (ua.includes('os x')) {
    os = 'osx';
  } else if (ua.includes('linux')) {
    os = 'osx';
  } else {
    os = 'other';
  }
  return os;
}

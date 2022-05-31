export default function detectOs(userAgent: Nullish<string>): OSTypes {
  if (!userAgent) {
    return 'unknown';
  }

  const ua = userAgent.toLowerCase();
  if (ua.includes('android')) {
    return 'android';
  }
  if (ua.includes('ipad') || ua.includes('iphone') || ua.includes('ipod')) {
    return 'ios';
  }
  if (ua.includes('mobile') || ua.includes('windows phone') || ua.includes('blackberry')) {
    return 'mobile';
  }
  if (ua.includes('windows')) {
    return 'windows';
  }
  if (ua.includes('os x')) {
    return 'osx';
  }
  if (ua.includes('linux')) {
    return 'osx';
  }
  return 'other';
}

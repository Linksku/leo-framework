type OSTypes = 'android' | 'ios' | 'desktop';

export default function detectOs(userAgent: string): OSTypes {
  const ua = userAgent.toLowerCase();
  if (ua.includes('android')) {
    return 'android';
  }
  if (ua.includes('ipad') || ua.includes('iphone') || ua.includes('ipod')) {
    return 'ios';
  }
  return 'desktop';
}

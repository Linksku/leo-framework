type OSTypes = 'android' | 'ios' | 'desktop';

let os: OSTypes | null = null;

export default function detectOs(): OSTypes {
  if (os) {
    return os;
  }

  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('android')) {
    os = 'android';
  } else if (ua.includes('ipad') || ua.includes('iphone') || ua.includes('ipod')) {
    os = 'ios';
  } else {
    os = 'desktop';
  }

  return os;
}

import detectOs from 'lib/detectOs';

export default function isOsMobile(userAgent: string) {
  const os = detectOs(userAgent);
  return os === 'android' || os === 'ios';
}

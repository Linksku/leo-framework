import detectOs from 'lib/detectOs';

let isMobile: boolean | null = null;

export default function getIsMobile() {
  if (isMobile === null) {
    const os = detectOs();
    isMobile = os === 'android' || os === 'ios';
  }
  return isMobile;
}

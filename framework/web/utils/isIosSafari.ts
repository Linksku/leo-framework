let memo = null as null | boolean;

export default function isIosSafari() {
  if (memo === null) {
    const ua = navigator.userAgent.toLowerCase();
    memo = ua.includes('safari')
      && !ua.includes('chrome')
      && !ua.includes('crios')
      && !ua.includes('fxios')
      && /\b(iphone|ipad|ipod)\b/.test(ua);
  }
  return memo;
}

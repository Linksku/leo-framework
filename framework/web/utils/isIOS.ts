let memo: boolean | null = null;

export default function isIOS() {
  if (memo === null) {
    const ua = navigator.userAgent.toLowerCase();
    memo = /\b(iphone|ipad|ipod)\b/.test(ua);
  }
  return memo;
}

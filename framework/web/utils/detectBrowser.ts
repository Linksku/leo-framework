type Browser = 'firefox' | 'chrome' | 'safari' | 'other';

let cache: Browser | undefined;

function _detectBrowser(): Browser {
  const ua = navigator.userAgent.toLowerCase();
  if (/(?:chrome|crios|crmo)\//.test(ua)) {
    return 'chrome';
  }
  if (/(?:safari|applewebkit)\//.test(ua)) {
    return 'safari';
  }
  if (/(?:firefox|fxios)\//.test(ua)) {
    return 'firefox';
  }
  return 'other';
}

export default function detectBrowser(): Browser {
  if (!cache) {
    cache = _detectBrowser();
  }

  return cache;
}

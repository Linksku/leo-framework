import detectBrowser from 'utils/detectBrowser';
import detectPlatform from 'utils/detectPlatform';

export function canCancelBacks(): boolean {
  const platform = detectPlatform();
  if (platform.isNative || platform.isStandalone) {
    return true;
  }
  if (platform.os === 'windows' || platform.os === 'osx' || platform.os === 'linux') {
    return detectBrowser() !== 'chrome';
  }
  return true;
}

export function hasOverscrollNav(): boolean {
  const platform = detectPlatform();
  if (platform.isNative) {
    return false;
  }
  if (platform.os === 'ios') {
    const browser = detectBrowser();
    // Note: FF, Opera, Brave don't have overscroll nav
    return platform.isStandalone
      || browser === 'chrome'
      || browser === 'safari'
      || /\b(edgios|duckduckgo)\b/.test(navigator.userAgent.toLowerCase());
  }
  if (platform.os === 'android') {
    return !platform.isStandalone && detectBrowser() === 'chrome';
  }
  return false;
}

export function fixMomentumScroll(): boolean {
  return detectBrowser() === 'chrome'
    && window.CSS.supports('scroll-behavior', 'smooth');
}

// https://github.com/w3c/pointerevents/issues/303
export function preventsSwipeDirectionChange(): boolean {
  // temp
  return true;
}

// https://stackoverflow.com/q/78255355/599184
export function clientXOffset(): number {
  const platform = detectPlatform();
  if (platform.isNative && platform.os === 'android') {
    return 15;
  }
  return 0;
}

export function needsRafForAnimations(): boolean {
  return detectBrowser() === 'firefox';
}

export function avoidTransitionTransforms(): boolean {
  const browser = detectBrowser();
  return browser === 'firefox' || browser === 'safari';
}

// OSX Tap to Click doesn't work
export function shouldFilterTaps(): boolean {
  return !(detectPlatform().os === 'osx' && detectBrowser() === 'safari');
}

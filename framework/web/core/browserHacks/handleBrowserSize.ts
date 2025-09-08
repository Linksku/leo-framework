import { Keyboard } from '@capacitor/keyboard';

import throttle from 'utils/throttle';
import isVirtualKeyboardOpen from 'utils/isVirtualKeyboardOpen';
import detectPlatform from 'utils/detectPlatform';
import { IS_100_HEIGHT } from 'config/webConfig';

if (TS.hasProp(navigator, 'virtualKeyboard')) {
  navigator.virtualKeyboard.overlaysContent = false;
}

function _handleResize() {
  if (isVirtualKeyboardOpen()) {
    document.documentElement.style.setProperty('--inset-bottom-override', '0px');
  } else {
    document.documentElement.style.removeProperty('--inset-bottom-override');
    document.documentElement.style.removeProperty('--offset-top');
  }

  // Note: on Android, after re-opening screen, height can be wrong
  document.documentElement.style.setProperty(
    '--vh100',
    `${Math.round(window.visualViewport?.height ?? window.innerHeight)}px`,
  );

  if (IS_100_HEIGHT) {
    // Move screen back after opening mobile keyboard
    window.scrollTo(0, 0);
  }
}

let resizeTimer: number | null = null;
const throttledHandleResize = throttle(
  () => {
    requestAnimationFrame(_handleResize);

    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    // Note: on iOS, height doesn't update immediately
    resizeTimer = window.setTimeout(_handleResize, 100);
  },
  { timeout: 100 },
);

const throttledHandleScroll = throttle(
  () => {
    if (isVirtualKeyboardOpen()) {
      // Prevents scrolling up and showing blank space when virtual keyboard is open
      document.documentElement.style.setProperty(
        '--offset-top',
        `${window.visualViewport?.offsetTop ?? 0}px`,
      );
    } else {
      document.documentElement.style.removeProperty('--offset-top');
    }
  },
  { timeout: 100 },
);

export default function handleBrowserSize() {
  _handleResize();

  window.addEventListener('resize', throttledHandleResize);
  window.addEventListener('focus', throttledHandleResize);
  // todo: med/blocked resize event doesn't always fire for ios
  window.visualViewport?.addEventListener('resize', throttledHandleResize);

  if (detectPlatform().isNative) {
    Keyboard.addListener('keyboardDidShow', throttledHandleResize)
      .catch(err => {
        ErrorLogger.warn(err, { ctx: 'Keyboard.keyboardDidShow' });
      });
    Keyboard.addListener('keyboardDidHide', throttledHandleResize)
      .catch(err => {
        ErrorLogger.warn(err, { ctx: 'Keyboard.keyboardDidHide' });
      });
  }

  window.visualViewport?.addEventListener(
    'scroll',
    throttledHandleScroll,
    { passive: true },
  );

  if (detectPlatform().os === 'ios') {
    setInterval(throttledHandleScroll, 100);
  }
}

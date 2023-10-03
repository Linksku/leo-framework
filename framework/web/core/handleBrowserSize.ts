import throttle from 'utils/throttle';
import isVirtualKeyboardOpen from 'utils/isVirtualKeyboardOpen';
import isIOS from 'utils/isIOS';

if (TS.hasProp(navigator, 'virtualKeyboard')) {
  (navigator.virtualKeyboard as any).overlaysContent = false;
}

function _handleResize() {
  if (isVirtualKeyboardOpen()) {
    document.documentElement.style.setProperty('--bottom-inset-hack', '0px');
  } else {
    document.documentElement.style.removeProperty('--bottom-inset-hack');
    document.documentElement.style.removeProperty('--top-inset-hack');
  }

  // Note: on Android, after re-opening screen, height can be wrong
  document.documentElement.style.setProperty(
    '--vh100',
    `${window.visualViewport?.height ?? window.innerHeight}px`,
  );

  // Move screen back after opening mobile keyboard
  window.scrollTo(0, 0);
}

let resizeTimer: number | null = null;
const throttledHandleResize = throttle(
  () => {
    requestAnimationFrame(_handleResize);

    if (resizeTimer) {
      clearTimeout(resizeTimer);
    }
    // Note: on iOS, height doesn't update immediately
    resizeTimer = setTimeout(_handleResize, 100);
  },
  { timeout: 100 },
);

const throttledHandleScroll = throttle(
  () => {
    if (isVirtualKeyboardOpen()) {
      // Prevents scrolling up and showing blank space when virtual keyboard is open
      document.documentElement.style.setProperty(
        '--top-inset-hack',
        `${window.visualViewport?.offsetTop ?? 0}px`,
      );
    } else {
      document.documentElement.style.removeProperty('--top-inset-hack');
    }
  },
  { timeout: 100 },
);

export default function handleBrowserSize() {
  _handleResize();

  window.addEventListener('resize', throttledHandleResize);
  window.addEventListener('focus', throttledHandleResize);
  // todo: mid/mid resize event doesn't always fire for ios
  window.visualViewport?.addEventListener('resize', throttledHandleResize);
  window.visualViewport?.addEventListener('scroll', throttledHandleScroll);

  if (isIOS()) {
    setInterval(throttledHandleScroll, 100);
  }
}

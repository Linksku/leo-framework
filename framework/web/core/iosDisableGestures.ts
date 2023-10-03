import isStandalone from 'utils/isStandalone';
import isIOS from 'utils/isIOS';
import { IOS_EDGE_SWIPE_PX, CLICK_MAX_WAIT } from 'consts/ui';

export default function iosDisableGestures() {
  const ua = navigator.userAgent.toLowerCase();
  const shouldDisable = isIOS()
    // Note: FF, Opera, Brave don't need disabling
    && (isStandalone || /\b(safari|chrome|edgios|duckduckgo)\b/.test(ua));
  if (!shouldDisable) {
    return;
  }

  document.addEventListener('gesturestart', e => {
    e.preventDefault();
  });
  document.addEventListener('gesturechange', e => {
    e.preventDefault();
  });

  const reactRoot = TS.notNull(document.getElementById('react'));
  let isTouching = false;
  let startTime = Number.MIN_SAFE_INTEGER;
  let moved = false;

  reactRoot.addEventListener('touchstart', e => {
    if ([...e.touches].some(
      touch => touch.pageX <= IOS_EDGE_SWIPE_PX
        || touch.pageX >= window.innerWidth - IOS_EDGE_SWIPE_PX,
    )) {
      isTouching = true;
      startTime = performance.now();
      moved = false;

      // Disable iOS Safari overscroll navigation
      e.preventDefault();

      if (!process.env.PRODUCTION
        && e.target instanceof Element
        && e.target.nodeName === 'SELECT') {
        ErrorLogger.warn(new Error('Disabled touchstart on <select />'), {
          elemTag: e.target.nodeName,
          elemClass: e.target.className,
        });
      }
    }
  });

  reactRoot.addEventListener('touchmove', () => {
    if (isTouching) {
      moved = true;
    }
  });

  reactRoot.addEventListener('touchend', ({ target }) => {
    if (isTouching
      && !moved
      && target instanceof Element
      && performance.now() - startTime < CLICK_MAX_WAIT) {
      window.setTimeout(() => {
        target.dispatchEvent(new Event('click', {
          bubbles: true,
          cancelable: true,
        }));
      }, 0);
    }

    isTouching = false;
  });

  reactRoot.addEventListener('touchcancel', () => {
    isTouching = false;
  });
}

import { IOS_EDGE_SWIPE_PX, CLICK_MAX_WAIT } from 'consts/ui';
import detectPlatform from 'utils/detectPlatform';

export default function disableOverscrollNav() {
  const platform = detectPlatform();
  const ua = navigator.userAgent.toLowerCase();
  const hasOverscrollNav = (platform.os === 'ios'
      // Note: FF, Opera, Brave don't need disabling
      && (platform.isStandalone || /\b(safari|chrome|edgios|duckduckgo)\b/.test(ua)))
    || (platform.os === 'android'
      && !platform.isStandalone && /\bchrome\//.test(ua));
  if (!hasOverscrollNav) {
    return;
  }

  const reactRoot = TS.notNull(document.getElementById('react'));
  let startX = null as number | null;
  let startY = null as number | null;
  let hasMoved = false;
  let startTime = Number.MIN_SAFE_INTEGER;

  reactRoot.addEventListener('touchstart', e => {
    const touch = e.touches.item(0);
    if (touch
      && e.touches.length === 1
      && (touch.pageX <= IOS_EDGE_SWIPE_PX
        || touch.pageX >= window.innerWidth - IOS_EDGE_SWIPE_PX)) {
      startX = touch.pageX;
      startY = touch.pageY;
      hasMoved = false;
      startTime = performance.now();

      // Disable overscroll navigation
      e.preventDefault();

      if (!process.env.PRODUCTION
        && e.target instanceof Element
        && e.target.nodeName === 'SELECT') {
        ErrorLogger.warn(new Error('disableOverscrollNav: disabled touchstart on <select />'), {
          elemTag: e.target.nodeName,
          elemClass: e.target.className,
        });
      }
    }
  });

  reactRoot.addEventListener(
    'touchmove',
    e => {
      if (startX != null && startY != null && !hasMoved) {
        const touch = e.touches.item(0);
        if (touch && (touch.pageX !== startX || touch.pageY !== startY)) {
          hasMoved = true;
        }
      }
    },
    { passive: true },
  );

  reactRoot.addEventListener('touchend', ({ target }) => {
    if (!startX || !startY) {
      return;
    }

    if (!hasMoved
      && target instanceof Element
      && performance.now() - startTime < CLICK_MAX_WAIT) {
      window.setTimeout(() => {
        if (!process.env.PRODUCTION) {
          // eslint-disable-next-line no-console
          console.log('disableOverscrollNav: trigger click');
        }

        target.dispatchEvent(new Event('click', {
          bubbles: true,
          cancelable: true,
        }));
      }, 0);
    } else if (!process.env.PRODUCTION) {
      // eslint-disable-next-line no-console
      console.log('disableOverscrollNav: cancelled gesture');
    }

    startX = null;
    startY = null;
  });

  reactRoot.addEventListener('touchcancel', () => {
    startX = null;
    startY = null;
  });
}

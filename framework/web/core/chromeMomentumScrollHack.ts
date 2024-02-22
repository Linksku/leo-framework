import { CLICK_MAX_WAIT } from 'consts/ui';

// For https://bugs.chromium.org/p/chromium/issues/detail?id=1474135
export default function chromeMomentumScrollHack() {
  if (document.onscrollend === undefined
    || !navigator.userAgent.toLowerCase().includes('chrome')
    || !window.CSS.supports('scroll-behavior', 'smooth')) {
    return;
  }

  let isScrolling = false;
  let lastScrollTime = Number.MIN_SAFE_INTEGER;
  let lastX = 0;
  let lastY = 0;
  let lastSpeed = 0;
  window.addEventListener(
    'scroll',
    e => {
      isScrolling = true;

      const curX = (e.target as HTMLElement).scrollLeft;
      const curY = (e.target as HTMLElement).scrollTop;
      lastSpeed = Math.sqrt(((lastX - curX) ** 2) + ((lastY - curY) ** 2))
        / (performance.now() - lastScrollTime)
        * 1000;
      // Maybe replace some performance.now with Date.now for perf
      lastScrollTime = performance.now();
      lastX = curX;
      lastY = curY;
    },
    {
      capture: true,
      passive: true,
    },
  );
  window.addEventListener(
    'scrollend',
    () => {
      isScrolling = false;
    },
    {
      capture: true,
      passive: true,
    },
  );

  let lastCancelClickTime = Number.MIN_SAFE_INTEGER;
  window.addEventListener(
    'touchstart',
    () => {
      if (isScrolling
        && performance.now() - lastScrollTime < 50
        && lastSpeed > 20) {
        lastCancelClickTime = performance.now();
      } else {
        lastCancelClickTime = Number.MIN_SAFE_INTEGER;
      }
    },
    {
      capture: true,
      passive: true,
    },
  );

  window.addEventListener(
    'click',
    event => {
      if (performance.now() - lastCancelClickTime < CLICK_MAX_WAIT) {
        if (!process.env.PRODUCTION) {
          // eslint-disable-next-line no-console
          console.log('chromeMomentumScrollHack: cancelled click');
        }

        event.preventDefault();
        event.stopPropagation();
      }

      lastCancelClickTime = Number.MIN_SAFE_INTEGER;
    },
    { capture: true },
  );
}

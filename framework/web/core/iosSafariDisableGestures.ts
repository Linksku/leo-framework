import isIosSafari from 'utils/isIosSafari';
import { NEAR_EDGE_PX } from 'utils/hooks/useSwipeNavigation';

// From Chrome device mode
const CLICK_MAX_WAIT = 700;

export default function iosSafariDisableGestures() {
  if (!isIosSafari()) {
    return;
  }

  document.addEventListener('gesturestart', e => {
    e.preventDefault();
  });
  document.addEventListener('gesturechange', e => {
    e.preventDefault();
  });

  const reactRoot = TS.notNull(document.getElementById('react'));
  let startTime = Number.MIN_SAFE_INTEGER;
  let startX = null as number | null;
  let startY = null as number | null;
  let moved = false;

  reactRoot.addEventListener('touchstart', e => {
    const touch = e.touches?.item(e.touches.length - 1);
    if (touch && (touch.pageX <= NEAR_EDGE_PX || touch.pageX >= window.innerWidth - NEAR_EDGE_PX)) {
      // Disable iOS Safari overscroll navigation
      e.preventDefault();

      startTime = performance.now();
      startX = touch.pageX;
      startY = touch.pageY;
      moved = false;
    }
  });

  reactRoot.addEventListener('touchmove', () => {
    moved = true;
  });

  reactRoot.addEventListener('touchend', e => {
    if (startX !== null
      && startY !== null
      && !moved
      && performance.now() - startTime < CLICK_MAX_WAIT) {
      window.setTimeout(() => {
        e.target?.dispatchEvent(new Event('click', {
          bubbles: true,
          cancelable: true,
        }));
      }, 0);
    }
    startX = null;
    startY = null;
    moved = false;
  });

  reactRoot.addEventListener('touchcancel', () => {
    startX = null;
    startY = null;
    moved = false;
  });
}

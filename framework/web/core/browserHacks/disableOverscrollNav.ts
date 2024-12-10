import { IOS_EDGE_SWIPE_PX, CLICK_MAX_WAIT, MAX_TAP_MOVE_DIST } from 'consts/ui';
import { hasOverscrollNav } from './browserHackGatings';

export default function disableOverscrollNav() {
  if (!hasOverscrollNav()) {
    return;
  }

  const reactRoot = TS.notNull(document.getElementById('react'));
  let startX = null as number | null;
  let startY = null as number | null;
  let maxMoveDist = 0;
  let startTime = Number.MIN_SAFE_INTEGER;

  reactRoot.addEventListener('touchstart', e => {
    const touch = e.touches.item(0);
    if (!touch
      || e.touches.length > 1
      || (touch.pageX > IOS_EDGE_SWIPE_PX
        && touch.pageX < window.innerWidth - IOS_EDGE_SWIPE_PX)) {
      return;
    }

    if (e.target instanceof Element
        && (touch.pageX > IOS_EDGE_SWIPE_PX / 3
          && touch.pageX < window.innerWidth - (IOS_EDGE_SWIPE_PX / 3))) {
      if (e.target.nodeName === 'SELECT'
        || e.target.nodeName === 'LABEL'
        || (e.target.nodeName === 'INPUT' && e.target.getAttribute('type') === 'file')) {
        return;
      }

      // Not
      if (e.target.closest('label')) {
        return;
      }
    }

    startX = touch.pageX;
    startY = touch.pageY;
    maxMoveDist = 0;
    startTime = performance.now();

    // Disable overscroll navigation
    e.preventDefault();
  });

  reactRoot.addEventListener(
    'touchmove',
    e => {
      if (startX != null && startY != null && maxMoveDist < MAX_TAP_MOVE_DIST) {
        const touch = e.touches.item(0);
        if (touch && (touch.pageX !== startX || touch.pageY !== startY)) {
          maxMoveDist = Math.max(
            maxMoveDist,
            Math.abs(touch.pageX - startX),
            Math.abs(touch.pageY - startY),
          );
        }
      }
    },
    { passive: true },
  );

  reactRoot.addEventListener('touchend', ({ target }) => {
    if (!startX || !startY) {
      return;
    }

    if (maxMoveDist < MAX_TAP_MOVE_DIST
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
      console.log(`disableOverscrollNav: cancelled gesture, moved ${Math.round(maxMoveDist * 10) / 10}px`);
    }

    startX = null;
    startY = null;
  });

  reactRoot.addEventListener('touchcancel', () => {
    startX = null;
    startY = null;
  });
}

import type { UserDragConfig } from '@use-gesture/core/types';
import { useDrag } from '@use-gesture/react';

import { CLICK_MAX_WAIT } from 'consts/ui';
import { DEFAULT_DURATION } from './useAnimation';

const NEAR_EDGE_PX = 30;
// Copied the following values from use-gesture
const MAX_SWIPE_DURATION = 250;
const MIN_SWIPE_VELOCITY = 0.5;
// Custom
export const MIN_SWIPE_PX = 10;

function _shouldSwipeNavigate({
  distToEdge,
  movedPercent,
  lastMoves,
  directionMultiplier,
}: {
  distToEdge: number,
  movedPercent: number,
  lastMoves: {
    time: number,
    x: number,
  }[],
  directionMultiplier: number,
}) {
  if (movedPercent >= 100) {
    return true;
  }

  let swipeMoves = lastMoves.filter(move => move.time > performance.now() - MAX_SWIPE_DURATION);
  // swipeMoves are in same direction
  swipeMoves = swipeMoves.filter(
    (move, idx) => idx === swipeMoves.length - 1
      || (swipeMoves[idx + 1].x - move.x) * directionMultiplier >= 0,
  );

  if (!TS.notEmpty(swipeMoves) || swipeMoves.length < 2) {
    return false;
  }
  const lastMove = swipeMoves.at(-1);

  for (const firstMove of swipeMoves.slice(0, -1)) {
    const dx = (lastMove.x - firstMove.x) * directionMultiplier;
    if (dx < MIN_SWIPE_PX) {
      continue;
    }
    if (distToEdge < NEAR_EDGE_PX && dx > NEAR_EDGE_PX) {
      return true;
    }

    const dt = lastMove.time - firstMove.time;
    if (dt && dx / dt > MIN_SWIPE_VELOCITY * (1 - (movedPercent / 100))) {
      return true;
    }
  }

  return false;
}

// touchmove/pointermove isn't sensitive enough to detect swipes too close to the edge
const MIN_DIST_FROM_EDGE = 10;
// Hacky fix for Chrome click not firing: https://bugs.chromium.org/p/chromium/issues/detail?id=1141207
function _simulateClickAfterSwipeHack() {
  const handleTouchstart = (touchStartEvent: TouchEvent) => {
    const startTouch = touchStartEvent.touches.item(0);
    if (!startTouch || touchStartEvent.touches.length > 1) {
      return;
    }
    const startX = startTouch.pageX;
    const startY = startTouch.pageY;
    if (startX < MIN_DIST_FROM_EDGE
      || startY < MIN_DIST_FROM_EDGE
      || startX > window.innerWidth - MIN_DIST_FROM_EDGE
      || startY > window.innerHeight - MIN_DIST_FROM_EDGE) {
      return;
    }

    let isValid = true;
    const handleTouchmove = (e: TouchEvent) => {
      const touch = e.touches.item(0);
      if (!touch || e.touches.length > 1
        || Math.sqrt(((touch.pageX - startX) ** 2) + ((touch.pageY - startY) ** 2)) > 5) {
        isValid = false;
        window.removeEventListener('touchmove', handleTouchmove);
      }
    };

    const handleTouchend = (e: TouchEvent) => {
      const { target } = e;
      if (!isValid || !target) {
        return;
      }

      e.preventDefault();
      setTimeout(() => {
        target.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }));
      }, 0);
    };

    // Bug didn't occur
    const handleMouseDown = () => {
      window.removeEventListener('touchmove', handleTouchmove);
      window.removeEventListener('touchend', handleTouchend);
    };

    const handleClick = (e: MouseEvent) => {
      if (!process.env.PRODUCTION && isValid && (e.pageX || e.pageY)) {
        ErrorLogger.error(new Error('_simulateClickAfterSwipeHack: real click event fired'));
      }
    };

    // Event order: touchstart, touchmove, touchend, mousedown, click
    window.addEventListener('touchmove', handleTouchmove);
    window.addEventListener('touchend', handleTouchend, { once: true });
    window.addEventListener('mousedown', handleMouseDown, { once: true });
    window.addEventListener('click', handleClick, { once: true });

    setTimeout(() => {
      window.removeEventListener('touchmove', handleTouchmove);
      window.removeEventListener('touchend', handleTouchend);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('click', handleClick);
    }, CLICK_MAX_WAIT);
  };

  window.addEventListener('touchstart', handleTouchstart, { once: true });
  setTimeout(() => {
    window.removeEventListener('touchstart', handleTouchstart);
  }, 2000);
}

type Direction = 'up' | 'left' | 'down' | 'right';
export type Props<T extends HTMLElement> = {
  direction: Direction | 'horizontal' | 'vertical',
  duration?: number,
  onStart?: ((direction: Direction) => void) | null,
  onNavigate?: (direction: Direction) => void | null,
  setPercent: (animationPercent: number, duration: number, direction: Direction) => void,
  disabled?: boolean,
  elementDim?: number,
  elementRef?: React.MutableRefObject<T | null>,
  getElement?: (direction: Direction) => T | null,
  maxSwipeStartDist?: number | [number | undefined, number | undefined]
  dragOpts?: UserDragConfig,
};

export default function useSwipeNavigation<T extends HTMLElement>({
  direction,
  duration = DEFAULT_DURATION,
  onStart,
  onNavigate,
  setPercent,
  disabled,
  elementDim,
  elementRef,
  getElement,
  maxSwipeStartDist,
  dragOpts,
}: Props<T>) {
  const axis = direction === 'left' || direction === 'right' || direction === 'horizontal' ? 'x' : 'y';
  const elemDimProp = axis === 'x' ? 'offsetWidth' : 'offsetHeight';
  const axisIdx = axis === 'x' ? 0 : 1;
  const windowDim = useWindowSize()[axis === 'x' ? 'width' : 'height'];

  const ref = useRef({
    lastMoves: [] as {
      time: number,
      x: number,
    }[],
    lastDelta: 0,
    lastSetPercentTime: Number.NEGATIVE_INFINITY,
    dim: null as number | null,
    curDirection: null as 'up' | 'left' | 'down' | 'right' | null,
  });
  const elementRef2 = useRef<T | null>(null);

  const bind = useDrag(({
    xy,
    movement,
    delta,
    velocity,
    first,
    last,
    cancel,
    canceled,
    event,
    tap,
  }) => {
    // Note: useDrag can get into a state where `last` is never true, so animation gets stuck
    if (canceled) {
      return;
    }
    if (disabled || tap || (
      first
        && event.target instanceof HTMLElement
        && event.target === document.activeElement
        // todo: low/mid enable swiping on textarea
        && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)
        && !['submit', 'button'].includes(event.target.getAttribute('type') ?? '')
    )) {
      cancel?.();
      return;
    }

    if (first) {
      ref.current.lastSetPercentTime = Number.NEGATIVE_INFINITY;
      if (direction === 'horizontal') {
        ref.current.curDirection = movement[axisIdx] > 0 ? 'right' : 'left';
      } else if (direction === 'vertical') {
        ref.current.curDirection = movement[axisIdx] > 0 ? 'down' : 'up';
      } else {
        ref.current.curDirection = direction;
      }
    }
    const curDirection = TS.notNull(ref.current.curDirection);

    if (first || !ref.current.dim) {
      const elem = getElement?.(curDirection)
        ?? elementRef?.current
        ?? elementRef2?.current;
      if (!elementDim && !elem) {
        if (!process.env.PRODUCTION) {
          throw new Error('useSwipeNavigation: missing elementRef');
        }
        return;
      }

      ref.current.dim = elementDim ?? TS.notNull(elem)[elemDimProp];
    }
    const x = xy[axisIdx];
    const mx = movement[axisIdx];
    const directionMultiplier = curDirection === 'right' || curDirection === 'down'
      ? 1
      : -1;
    if (first) {
      const maxSwipeStartDist1 = Array.isArray(maxSwipeStartDist)
        ? maxSwipeStartDist[0]
        : maxSwipeStartDist;
      const maxSwipeStartDist2 = Array.isArray(maxSwipeStartDist)
        ? maxSwipeStartDist[1]
        : maxSwipeStartDist;
      if ((maxSwipeStartDist1 && directionMultiplier === 1
          && x > maxSwipeStartDist1)
        || (maxSwipeStartDist2 && directionMultiplier === -1
          && ref.current.dim - x > maxSwipeStartDist2)
      ) {
        cancel?.();
        return;
      }

      onStart?.(curDirection);
    }

    let swipePercent = mx / ref.current.dim * directionMultiplier;
    swipePercent = Math.min(1, Math.max(0, swipePercent)) * 100;

    if (last) {
      // pass
    } else if (first || Math.sign(delta[axisIdx]) !== Math.sign(ref.current.lastDelta)) {
      ref.current.lastMoves = [{
        time: performance.now(),
        x: mx,
      }];
    } else {
      ref.current.lastMoves.push({
        time: performance.now(),
        x: mx,
      });
    }
    ref.current.lastDelta = delta[axisIdx];

    if (last) {
      const distToEdge = Math.min(
        ref.current.dim,
        Math.max(0, directionMultiplier === 1 ? windowDim - x : x),
      );
      const percentToEdge = distToEdge / ref.current.dim;
      if (_shouldSwipeNavigate({
        distToEdge,
        movedPercent: swipePercent,
        lastMoves: ref.current.lastMoves,
        directionMultiplier,
      })) {
        let remainingDuration = duration * percentToEdge;
        if (velocity[axisIdx]) {
          remainingDuration = Math.min(
            remainingDuration,
            (ref.current.dim * percentToEdge) / velocity[axisIdx],
          );
        }
        setPercent(
          100,
          Math.max(duration / 5, remainingDuration),
          curDirection,
        );
        onNavigate?.(curDirection);
      } else {
        let animationDuration = (1 - percentToEdge) * duration;
        if (velocity[axisIdx]) {
          animationDuration = Math.min(
            animationDuration,
            ref.current.dim * (1 - percentToEdge) / velocity[axisIdx],
          );
        }
        setPercent(
          0,
          Math.max(duration / 5, animationDuration),
          curDirection,
        );
      }

      window.addEventListener('touchend', _simulateClickAfterSwipeHack);
      setTimeout(() => {
        window.removeEventListener('touchend', _simulateClickAfterSwipeHack);
      }, 500);
    } else if (performance.now() - ref.current.lastSetPercentTime > 1000 / 120) {
      ref.current.lastSetPercentTime = performance.now();
      setPercent(
        swipePercent,
        duration / 10,
        curDirection,
      );
    }
  }, {
    ...dragOpts,
    axis,
    filterTaps: true,
    tapsThreshold: 1,
    // Note: no axisThreshold because it feels laggy
  });

  return {
    ref: elementRef2,
    bindSwipe: bind,
  };
}

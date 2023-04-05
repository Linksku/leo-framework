import type { UserDragConfig } from '@use-gesture/core/types';
import { useDrag } from '@use-gesture/react';

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
  if (distToEdge < NEAR_EDGE_PX || movedPercent >= 100) {
    return true;
  }

  let swipeMoves = lastMoves.filter(move => move.time > performance.now() - MAX_SWIPE_DURATION);
  // swipeMoves are in same direction
  swipeMoves = swipeMoves.filter(
    (move, idx) => idx === swipeMoves.length - 1
      || (swipeMoves[idx + 1].x - move.x) * directionMultiplier >= 0,
  );

  if (swipeMoves.length < 2) {
    return false;
  }
  const lastMove = swipeMoves[swipeMoves.length - 1];

  for (const firstMove of swipeMoves.slice(0, -1)) {
    const dx = (lastMove.x - firstMove.x) * directionMultiplier;
    if (dx < MIN_SWIPE_PX) {
      continue;
    }

    const dt = lastMove.time - firstMove.time;
    if (dt && dx / dt > MIN_SWIPE_VELOCITY * (1 - (movedPercent / 100))) {
      return true;
    }
  }

  return false;
}

type Direction = 'up' | 'left' | 'down' | 'right';
export type Props<T extends HTMLElement> = {
  direction: Direction | 'horizontal' | 'vertical',
  onStart?: ((direction: Direction) => void) | null,
  onNavigate?: (direction: Direction) => void | null,
  setPercent: (animationPercent: number, durationPercent: number, direction: Direction) => void,
  enabled?: boolean,
  elementDim?: number,
  elementRef?: React.MutableRefObject<T | null>,
  getElement?: (direction: Direction) => T | null,
  maxSwipeStartDist?: number,
  dragOpts?: UserDragConfig,
};

// todo: mid/mid cancel previous animation on drag
export default function useSwipeNavigation<T extends HTMLElement>({
  direction,
  onStart,
  onNavigate,
  setPercent,
  enabled = true,
  elementDim,
  elementRef,
  getElement,
  maxSwipeStartDist,
  dragOpts,
}: Props<T>) {
  const axis = direction === 'left' || direction === 'right' || direction === 'horizontal' ? 'x' : 'y';
  const elemDimProp = axis === 'x' ? 'offsetWidth' : 'offsetHeight';
  const windowDimProp = axis === 'x' ? 'innerWidth' : 'innerHeight';
  const axisIdx = axis === 'x' ? 0 : 1;

  const ref = useRef({
    lastMoves: [] as {
      time: number,
      x: number,
    }[],
    lastDelta: 0,
    lastSetPercentTime: Number.NEGATIVE_INFINITY,
    dim: null as number | null,
    windowDim: null as number | null,
    curDirection: null as 'up' | 'left' | 'down' | 'right' | null,
  });
  const elementRef2 = useRef<T | null>(null);

  const bind = useDrag(({
    xy,
    movement,
    delta,
    first,
    last,
    cancel,
    canceled,
    event,
    tap,
  }) => {
    if (canceled) {
      return;
    }
    if (!enabled || tap || (
      first
        && event.target instanceof HTMLElement
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

    if (first || !ref.current.dim || !ref.current.windowDim) {
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
      ref.current.windowDim = window[windowDimProp];
    }
    const x = xy[axisIdx];
    const mx = movement[axisIdx];
    const directionMultiplier = curDirection === 'right' || curDirection === 'down'
      ? 1
      : -1;
    if (first && maxSwipeStartDist && (
      (directionMultiplier === 1 && x > maxSwipeStartDist)
      || (directionMultiplier === -1 && ref.current.dim - x > maxSwipeStartDist)
    )) {
      cancel?.();
      return;
    }

    if (first) {
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
      if (_shouldSwipeNavigate({
        distToEdge: directionMultiplier === 1 ? ref.current.windowDim - x : x,
        movedPercent: swipePercent,
        lastMoves: ref.current.lastMoves,
        directionMultiplier,
      })) {
        setPercent(100, 1 - (swipePercent / 100), curDirection);
        onNavigate?.(curDirection);
      } else {
        setPercent(0, swipePercent / 100, curDirection);
      }

      // Hacky fix for Chrome click not firing: https://bugs.chromium.org/p/chromium/issues/detail?id=1141207
      const swipeEndTime = performance.now();
      window.addEventListener('touchend', () => {
        let startX: number | undefined;
        let startY: number | undefined;
        const handleTouchstart = (e: TouchEvent) => {
          const touch = e.touches?.item(e.touches.length - 1);
          startX = touch?.pageX;
          startY = touch?.pageY;
        };

        let lastX: number | undefined;
        let lastY: number | undefined;
        const handleTouchmove = (e: TouchEvent) => {
          const touch = e.touches?.item(e.touches.length - 1);
          lastX = touch?.pageX;
          lastY = touch?.pageY;
        };

        const handleTouchend = (e: TouchEvent) => {
          if (performance.now() - swipeEndTime < 2000
            && startX
            && startY
            && (!lastX || Math.abs(lastX - startX) < 5)
            && (!lastY || Math.abs(lastY - startY) < 5)) {
            setTimeout(() => {
              e.target?.dispatchEvent(new Event('click', {
                bubbles: true,
                cancelable: true,
              }));
            }, 0);
          }
        };

        window.addEventListener('touchstart', handleTouchstart, { once: true });
        window.addEventListener('touchmove', handleTouchmove, { once: true });
        window.addEventListener('touchend', handleTouchend, { once: true });

        window.addEventListener('mousedown', () => {
          window.removeEventListener('touchstart', handleTouchstart);
          window.removeEventListener('touchmove', handleTouchmove);
          window.removeEventListener('touchend', handleTouchend);
        }, { once: true });
      }, { once: true });
    } else if (performance.now() - ref.current.lastSetPercentTime > 10) {
      ref.current.lastSetPercentTime = performance.now();
      setPercent(swipePercent, 0.2, curDirection);
    }
  }, {
    ...dragOpts,
    axis,
    filterTaps: true,
    axisThreshold: {
      mouse: MIN_SWIPE_PX,
      touch: MIN_SWIPE_PX,
    },
  });

  return {
    ref: elementRef2,
    bindSwipe: bind,
  };
}

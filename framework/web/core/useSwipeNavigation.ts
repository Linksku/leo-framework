import type { UserDragConfig } from '@use-gesture/core/types';
import type { ReactDOMAttributes } from '@use-gesture/react/dist/declarations/src/types';
import { useDrag } from '@use-gesture/react';

import type easings from 'utils/easings';
import { CLICK_MAX_WAIT, DISABLE_BROWSER_HACKS, MAX_TAP_MOVE_DIST } from 'consts/ui';
import {
  clientXOffset,
  shouldFilterTaps,
} from 'core/browserHacks/browserHackGatings';
import clamp from 'utils/math/clamp';
import useWindowSize from 'core/globalState/useWindowSize';
import getFps from 'utils/getFps';
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

  const lastMove = lastMoves.at(-1);
  if (!lastMove) {
    return false;
  }
  if (distToEdge < NEAR_EDGE_PX
    && lastMoves.some(move => (lastMove.x - move.x) * directionMultiplier >= MIN_SWIPE_PX)) {
    // Swiped to edge, then held finger there
    return true;
  }

  let lastSwipeMoveIdx = 0;
  for (let i = lastMoves.length - 2; i >= 0; i--) {
    const move = lastMoves[i];
    if (move.time < performance.now() - MAX_SWIPE_DURATION
      || (lastMoves[i + 1].x - move.x) * directionMultiplier < 0) {
      lastSwipeMoveIdx = i + 1;
      break;
    }
  }
  const swipeMoves = lastMoves.slice(lastSwipeMoveIdx);
  if (swipeMoves.length < 2) {
    return false;
  }

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
        if (!process.env.PRODUCTION) {
          // eslint-disable-next-line no-console
          console.log('useSwipeNavigation: trigger click');
        }

        target.dispatchEvent(new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
        }));
      }, 0);
    };

    // Bug didn't occur
    const removeTouchListeners = () => {
      window.removeEventListener('touchmove', handleTouchmove);
      window.removeEventListener('touchend', handleTouchend);
    };

    // Event order: touchstart, touchmove, touchend, mousedown, click
    window.addEventListener('touchmove', handleTouchmove, { passive: true });
    window.addEventListener('touchend', handleTouchend, { once: true });
    window.addEventListener('mousedown', removeTouchListeners, { once: true });
    window.addEventListener(
      'scroll',
      removeTouchListeners,
      { once: true, capture: true, passive: true },
    );
    window.addEventListener('click', removeTouchListeners, { once: true });

    setTimeout(() => {
      window.removeEventListener('touchmove', handleTouchmove);
      window.removeEventListener('touchend', handleTouchend);
      window.removeEventListener('mousedown', removeTouchListeners);
      window.removeEventListener('scroll', removeTouchListeners, { capture: true });
      window.removeEventListener('click', removeTouchListeners);
    }, CLICK_MAX_WAIT);
  };

  window.addEventListener('touchstart', handleTouchstart, { once: true, passive: true });

  const removeTouchStart = () => {
    window.removeEventListener('touchstart', handleTouchstart);
  };
  window.addEventListener('scroll', removeTouchStart, { once: true, capture: true });
  setTimeout(removeTouchStart, 2000);
}

type Direction = 'up' | 'left' | 'down' | 'right';
export type Props<T extends HTMLElement> = {
  direction: Direction | 'horizontal' | 'vertical',
  duration?: number,
  onStart?: ((direction: Direction) => void) | null,
  onNavigate?: (direction: Direction) => void | null,
  setPercent: (
    animationPercent: number,
    duration: number,
    opts: {
      direction: Direction,
      easing: 'none' | keyof typeof easings,
    },
  ) => void,
  disabled?: boolean,
  elementDim?: number,
  elementRef?: React.RefObject<T | null>,
  maxSwipeStartDist?: number | [number | undefined, number | undefined]
  dragOpts?: UserDragConfig,
};

export type Ret<T extends HTMLElement> = {
  ref: React.RefObject<T | null>,
  bindSwipe: (...args: any[]) => ReactDOMAttributes,
};

// In Android webviews, drag start is delayed by 100ms: https://issues.chromium.org/issues/333624618
export default function useSwipeNavigation<T extends HTMLElement>({
  direction,
  duration = DEFAULT_DURATION,
  onStart,
  onNavigate,
  setPercent,
  disabled,
  elementDim,
  elementRef,
  maxSwipeStartDist,
  dragOpts,
}: Props<T>): Ret<T> {
  const axis = direction === 'left' || direction === 'right' || direction === 'horizontal'
    ? 'x'
    : 'y';
  const elemDimProp = axis === 'x' ? 'clientWidth' : 'clientHeight';
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
    if (tap || (first && canceled)) {
      return;
    }

    // Set up vars
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
    let {
      curDirection,
      dim,
      lastMoves,
      lastDelta,
      lastSetPercentTime,
    } = ref.current;
    if (!curDirection) {
      // Rare bug where `first` block doesn't run and drag doesn't end
      cancel();
      return;
    }

    if (first || !dim) {
      const elem = elementRef?.current
        ?? elementRef2?.current;
      if (!elementDim && !elem) {
        if (!process.env.PRODUCTION) {
          throw new Error('useSwipeNavigation: missing elementRef');
        }
        return;
      }

      dim = ref.current.dim = elementDim ?? TS.notNull(elem)[elemDimProp];
    }
    const x = xy[axisIdx];
    const mx = movement[axisIdx];
    const directionMultiplier = curDirection === 'right' || curDirection === 'down'
      ? 1
      : -1;
    let swipePercent = mx / dim * directionMultiplier * 100;
    swipePercent = clamp(swipePercent, 0, 100);

    // Move to final position
    if (canceled || last) {
      const distToEdge = Math.min(
        dim,
        Math.max(0, directionMultiplier === 1 ? windowDim - x : x),
      );
      const percentToEdge = distToEdge / dim;
      if (!canceled && _shouldSwipeNavigate({
        distToEdge,
        movedPercent: swipePercent,
        lastMoves,
        directionMultiplier,
      })) {
        let remainingDuration = duration * percentToEdge;
        if (velocity[axisIdx]) {
          const durationFromVelocity = Math.min(
            duration,
            (dim * percentToEdge) / velocity[axisIdx],
          );
          if (durationFromVelocity < remainingDuration) {
            // Just using durationFromVelocity feels too fast
            remainingDuration = (remainingDuration + durationFromVelocity) / 2;
          }
        }
        setPercent(
          100,
          Math.max(duration / 4, remainingDuration),
          {
            direction: curDirection,
            easing: 'easeOutQuad',
          },
        );

        setTimeout(() => {
          onNavigate?.(curDirection);
        }, 0);
      } else {
        let animationDuration = (1 - percentToEdge) * duration;
        if (velocity[axisIdx]) {
          animationDuration = Math.min(
            animationDuration,
            dim * (1 - percentToEdge) / velocity[axisIdx],
          );
        }
        setPercent(
          0,
          Math.max(duration / 4, animationDuration),
          {
            direction: curDirection,
            easing: 'easeOutQuad',
          },
        );
      }

      if (!DISABLE_BROWSER_HACKS) {
        window.addEventListener('touchend', _simulateClickAfterSwipeHack);
        setTimeout(() => {
          window.removeEventListener('touchend', _simulateClickAfterSwipeHack);
        }, 500);
      }

      return;
    }

    // Cancel
    if (disabled) {
      cancel();
      return;
    }
    if (first) {
      if (event.target instanceof HTMLElement
        && event.target === document.activeElement
        // todo: low/med enable swiping on textarea
        && ['INPUT', 'TEXTAREA'].includes(event.target.tagName)
        && !['submit', 'button'].includes(event.target.getAttribute('type') ?? '')) {
        cancel();
        return;
      }

      const maxSwipeStartDist1 = Array.isArray(maxSwipeStartDist)
        ? maxSwipeStartDist[0]
        : maxSwipeStartDist;
      const maxSwipeStartDist2 = Array.isArray(maxSwipeStartDist)
        ? maxSwipeStartDist[1]
        : maxSwipeStartDist;
      if ((maxSwipeStartDist1
          && directionMultiplier === 1
          && x > maxSwipeStartDist1 + clientXOffset())
        || (maxSwipeStartDist2
          && directionMultiplier === -1
          && dim - x > maxSwipeStartDist2 + clientXOffset())
      ) {
        cancel();
        return;
      }
    }

    // Handle moves
    if (!last && (first || delta[axisIdx])) {
      if (first || Math.sign(delta[axisIdx]) !== Math.sign(lastDelta)) {
        lastMoves = ref.current.lastMoves = [{
          time: performance.now(),
          x: mx,
        }];
      } else {
        lastMoves.push({
          time: performance.now(),
          x: mx,
        });
      }
      lastDelta = ref.current.lastDelta = delta[axisIdx];
    }

    if (first) {
      onStart?.(curDirection);
    }
    if (performance.now() - lastSetPercentTime > 1000 / getFps()) {
      /*
      if (swipePercent > 0
        && swipePercent < 100
        && lastMoves.length > 3) {
        // To prevent blocked thread from causing jitter, predict future position
        const lastMove = lastMoves.at(-1) as { time: number, x: number };
        const firstMove = lastMoves.at(-3) as { time: number, x: number };

        const avgVelocity = (lastMove.x - firstMove.x)
          / (lastMove.time - firstMove.time);
        const percentVelocity = avgVelocity / dim * directionMultiplier * 100;
        const overshootPercent = clamp(percentVelocity * duration / 4, -10, 10);
        swipePercent = clamp(swipePercent + overshootPercent, 0, 100);
      }
      */

      lastSetPercentTime = ref.current.lastSetPercentTime = performance.now();
      setPercent(
        swipePercent,
        // Longer duration is less affected by blocked thread
        duration / 4,
        {
          direction: curDirection,
          easing: 'easeOutQuad',
        },
      );
    }
  }, {
    ...dragOpts,
    axis,
    filterTaps: shouldFilterTaps(),
    tapsThreshold: MAX_TAP_MOVE_DIST,
    // Fixes alt+arrow messing up use-gesture state with `axis: y`
    keyboardDisplacement: 0,
    // Note: no axisThreshold because it feels laggy
  });

  return {
    ref: elementRef2,
    bindSwipe: bind,
  };
}

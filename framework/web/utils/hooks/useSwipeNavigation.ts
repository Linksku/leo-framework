import type { UserDragConfig } from '@use-gesture/core/types';
import { useDrag } from '@use-gesture/react';

export const NEAR_EDGE_PX = 30;
// Copied the following values from use-gesture
const MIN_SWIPE_PX = 50;
const MAX_SWIPE_DURATION = 250;
const MIN_SWIPE_VELOCITY = 0.5;

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

  const firstMove = lastMoves.find(move => move.time > performance.now() - MAX_SWIPE_DURATION);
  const lastMove = lastMoves[lastMoves.length - 1];
  if (!firstMove || !lastMove) {
    return false;
  }
  const dx = (lastMove.x - firstMove.x) * directionMultiplier;
  const dt = lastMove.time - firstMove.time;
  if (dx > MIN_SWIPE_PX && dt && dx / dt > MIN_SWIPE_VELOCITY) {
    return true;
  }

  return false;
}

export type Props<T extends HTMLElement> = {
  direction: 'up' | 'left' | 'down' | 'right',
  onStart?: (() => void) | null,
  onNavigate?: Memoed<() => void> | null,
  setPercent: (percent: number, quick: boolean) => void,
  enabled?: boolean,
  elementRef?: React.MutableRefObject<T | null>,
  maxSwipeStartDist?: number,
  dragOpts?: UserDragConfig,
};

export default function useSwipeNavigation<T extends HTMLElement>({
  direction,
  onStart,
  onNavigate,
  setPercent,
  enabled = true,
  elementRef,
  maxSwipeStartDist,
  dragOpts,
}: Props<T>) {
  const directionMultiplier = direction === 'right' || direction === 'down' ? 1 : -1;
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const elemDimProp = axis === 'x' ? 'offsetWidth' : 'offsetHeight';
  const windowDimProp = axis === 'x' ? 'innerWidth' : 'innerHeight';
  const axisIdx = axis === 'x' ? 0 : 1;

  const ref = useRef({
    lastMoves: [] as {
      time: number,
      x: number,
    }[],
    lastDelta: 0,
    dim: null as number | null,
    windowDim: null as number | null,
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
    const elem = elementRef?.current ?? elementRef2?.current;
    if (!enabled || canceled || tap || !elem
      || ['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
      return;
    }

    if (!elementRef?.current && !elementRef2?.current) {
      if (!process.env.PRODUCTION) {
        ErrorLogger.warn(new Error('useSwipeNavigation doesn\'t have refs.'));
      }
      return;
    }

    const x = xy[axisIdx];
    const mx = movement[axisIdx];

    if (first && maxSwipeStartDist && x * directionMultiplier > maxSwipeStartDist) {
      cancel?.();
      return;
    }

    if (first) {
      onStart?.();
    }

    if (first || !ref.current.dim || !ref.current.windowDim) {
      ref.current.dim = elem[elemDimProp];
      ref.current.windowDim = window[windowDimProp];
    }

    let swipePercent = mx / ref.current.dim * directionMultiplier;
    swipePercent = Math.min(1, Math.max(0, swipePercent)) * 100;

    if (last) {
      if (_shouldSwipeNavigate({
        distToEdge: directionMultiplier === 1 ? ref.current.windowDim - x : x,
        movedPercent: swipePercent,
        lastMoves: ref.current.lastMoves,
        directionMultiplier,
      })) {
        setPercent(100, false);
        onNavigate?.();
      } else {
        setPercent(0, false);
      }

      // Note: Chrome click may not fire: https://bugs.chromium.org/p/chromium/issues/detail?id=1141207
    } else {
      setPercent(swipePercent, true);
    }

    if (last || first || Math.sign(delta[axisIdx]) !== Math.sign(ref.current.lastDelta)) {
      ref.current.lastMoves = [];
    } else {
      ref.current.lastMoves.push({
        time: performance.now(),
        x: mx,
      });
    }
    ref.current.lastDelta = delta[axisIdx];
  }, {
    ...dragOpts,
    axis,
    filterTaps: true,
  });

  return {
    ref: elementRef2,
    bindSwipe: bind,
  };
}

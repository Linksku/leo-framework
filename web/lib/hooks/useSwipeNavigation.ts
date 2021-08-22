import type { UseDragConfig } from 'react-use-gesture/dist/types.d';
import { useDrag } from 'react-use-gesture';

import shouldSwipeNavigate from 'lib/shouldSwipeNavigate';

type Props = {
  direction: 'up' | 'left' | 'down' | 'right',
  onStart?: (() => void) | null,
  onNavigate?: (() => void) | null,
  onCancelNavigate?: (() => void) | null,
  onFinish?: (() => void) | null,
  setPercent: (percent: number) => void,
  enabled?: boolean,
  elementRef?: React.MutableRefObject<any>,
  maxSwipeStartDist?: number,
} & UseDragConfig;

export default function useSwipeNavigation({
  direction,
  onStart,
  onNavigate,
  onCancelNavigate,
  onFinish,
  setPercent,
  enabled = true,
  elementRef,
  maxSwipeStartDist,
  ...options
}: Props) {
  const directionMultiplier = direction === 'right' || direction === 'down' ? 1 : -1;
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const elemDimProp = axis === 'x' ? 'offsetWidth' : 'offsetHeight';
  const windowDimProp = axis === 'x' ? 'innerWidth' : 'innerHeight';
  const axisIdx = axis === 'x' ? 0 : 1;

  const ref = useRef({
    lastMoveTime: 0,
    dim: null as number | null,
    windowDim: null as number | null,
    hasNavigated: false,
  });
  const elementRef2 = useRef<any>();

  const bind = useDrag(({
    xy,
    movement,
    vxvy,
    first,
    last,
    cancel,
    canceled,
  }) => {
    if (!enabled || canceled) {
      return;
    }

    if (!elementRef?.current && !elementRef2?.current) {
      if (process.env.NODE_ENV !== 'production') {
        console.error('useSwipeNavigation doesn\'t have refs.');
      }
      return;
    }

    const x = xy[axisIdx];
    const mx = movement[axisIdx];
    const vx = vxvy[axisIdx];

    if (first && maxSwipeStartDist && x * directionMultiplier > maxSwipeStartDist) {
      cancel?.();
      return;
    }

    if (first) {
      onStart?.();
    }

    if (first || !ref.current.dim || !ref.current.windowDim) {
      ref.current.dim = (elementRef?.current?.[elemDimProp]
        || elementRef2?.current?.[elemDimProp]) as number;
      ref.current.windowDim = window[windowDimProp];
    }

    let swipePercent = mx / ref.current.dim * directionMultiplier;
    swipePercent = Math.min(1, Math.max(0, swipePercent)) * 100;

    if (last) {
      if (shouldSwipeNavigate({
        distToEdge: directionMultiplier === 1 ? ref.current.windowDim - x : x,
        movedAbs: mx * directionMultiplier,
        movedPercent: swipePercent,
        timeSinceLastMove: performance.now() - ref.current.lastMoveTime,
        lastVelocity: vx * directionMultiplier,
      })) {
        setPercent(100);
        onNavigate?.();
        ref.current.hasNavigated = true;
      } else {
        setPercent(0);
        if (ref.current.hasNavigated) {
          onCancelNavigate?.();
          ref.current.hasNavigated = false;
        }
      }

      onFinish?.();
    } else {
      setPercent(swipePercent);
    }

    ref.current.lastMoveTime = performance.now();
  }, {
    ...options,
    axis,
    filterTaps: true,
  });

  return {
    ref: elementRef2,
    bindSwipe: bind,
  };
}

import type { UseDragConfig } from 'react-use-gesture/dist/types.d';
import { useDrag } from 'react-use-gesture';

import shouldSwipeNavigate from 'lib/shouldSwipeNavigate';

type Props<T extends HTMLElement> = {
  direction: 'up' | 'left' | 'down' | 'right',
  onStart?: (() => void) | null,
  onNavigate?: (() => void) | null,
  onFinish?: (() => void) | null,
  setPercent: (percent: number) => void,
  enabled?: boolean,
  elementRef?: React.MutableRefObject<T | null>,
  maxSwipeStartDist?: number,
} & UseDragConfig;

export default function useSwipeNavigation<T extends HTMLElement>({
  direction,
  onStart,
  onNavigate,
  onFinish,
  setPercent,
  enabled = true,
  elementRef,
  maxSwipeStartDist,
  ...options
}: Props<T>) {
  const directionMultiplier = direction === 'right' || direction === 'down' ? 1 : -1;
  const axis = direction === 'left' || direction === 'right' ? 'x' : 'y';
  const elemDimProp = axis === 'x' ? 'offsetWidth' : 'offsetHeight';
  const windowDimProp = axis === 'x' ? 'innerWidth' : 'innerHeight';
  const axisIdx = axis === 'x' ? 0 : 1;

  const ref = useRef({
    lastMoveTime: 0,
    dim: null as number | null,
    windowDim: null as number | null,
  });
  const elementRef2 = useRef<T | null>(null);

  const bind = useDrag(({
    xy,
    movement,
    vxvy,
    first,
    last,
    cancel,
    canceled,
    event,
  }) => {
    const elem = elementRef?.current ?? elementRef2?.current;
    if (!enabled || canceled || !elem
      || ['INPUT', 'TEXTAREA'].includes((event.target as HTMLElement)?.tagName)) {
      return;
    }

    if (!elementRef?.current && !elementRef2?.current) {
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
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
      ref.current.dim = elem[elemDimProp];
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
      } else {
        setPercent(0);
      }

      // Fix Chrome click not firing: https://bugs.chromium.org/p/chromium/issues/detail?id=1141207
      setTimeout(() => {
        let timer: number | null = null;
        window.addEventListener('touchend', e => {
          if (timer) {
            clearTimeout(timer);
          }

          timer = window.setTimeout(() => {
            e.target?.dispatchEvent(new Event('click', {
              bubbles: true,
              cancelable: true,
            }));
          }, 0);
        }, { once: true });

        window.addEventListener('click', () => {
          if (timer) {
            clearTimeout(timer);
          }
        }, { once: true });
      }, 0);

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

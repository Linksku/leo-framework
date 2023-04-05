import styleDeclarationToCss from 'utils/styleDeclarationToCss';
import getFrameDuration from 'utils/getFrameDuration';
import easings from 'utils/easings';

export const DEFAULT_DURATION = 300;
const MIN_TIMEOUT = 10;

export type ValToStyle = Partial<{
  [k in keyof React.CSSProperties]: (x: number) => React.CSSProperties[k];
}>;

export type Style = Partial<React.CSSProperties>;

export type AnimationStyle = Memoed<(
  animatedVal: AnimatedValue,
  valToStyle: ValToStyle,
  opts?: {
    easing?: keyof typeof easings,
    keyframes?: number[],
  },
) => Style>;

export class AnimatedValue {
  lastSetValTime = 0;
  lastDuration = 0;
  startVal: number;
  finalVal: number;
  debugName: string;
  listeners: Set<() => void>;
  didRender = false;

  constructor(defaultVal: number, debugName?: string) {
    this.startVal = defaultVal;
    this.finalVal = defaultVal;
    this.debugName = debugName ?? '';
    this.listeners = new Set();
  }

  getCurPercent() {
    if (!this.lastSetValTime || !this.didRender) {
      return 0;
    }
    const elapsed = performance.now() - this.lastSetValTime;
    if (elapsed >= this.lastDuration) {
      return 1;
    }
    return elapsed / this.lastDuration;
  }

  getCurVal() {
    return this.startVal
      + ((this.finalVal - this.startVal) * this.getCurPercent());
  }

  setVal(finalVal: number, duration = DEFAULT_DURATION) {
    if (duration < 0) {
      if (!process.env.PRODUCTION) {
        throw new Error(`AnimatedVal.setVal: invalid duration: ${duration}`);
      }
      duration = 0;
    }

    const curVal = this.getCurVal();
    this.startVal = curVal;
    this.finalVal = finalVal;
    this.lastSetValTime = performance.now();
    this.lastDuration = duration;
    this.didRender = false;

    for (const fn of this.listeners) {
      fn();
    }
  }

  // todo: low/mid animation easing
  getNextKeyframe(keyframeVals: number[], lastKeyframeVal: number) {
    const increasing = this.finalVal >= this.startVal;
    const curVal = increasing
      ? Math.min(lastKeyframeVal, this.getCurVal())
      : Math.max(lastKeyframeVal, this.getCurVal());
    let nextKeyframeVal = this.finalVal;
    if (this.isAnimating()) {
      for (const val of keyframeVals) {
        if ((increasing && val > curVal && val < nextKeyframeVal)
          || (!increasing && val < curVal && val > nextKeyframeVal)) {
          nextKeyframeVal = val;
        }
      }
    }

    const timeToNextKeyframe = this.lastDuration <= 0 || this.finalVal === this.startVal
      ? 0
      : Math.max(
        0,
        (Math.abs((nextKeyframeVal - curVal) / (this.finalVal - this.startVal))
          * this.lastDuration),
      );
    return {
      val: nextKeyframeVal,
      duration: timeToNextKeyframe,
      isFinal: nextKeyframeVal === this.finalVal,
    };
  }

  isAnimating() {
    if (!this.lastSetValTime) {
      return false;
    }
    if (!this.didRender) {
      return true;
    }
    const elapsed = performance.now() - this.lastSetValTime;
    return elapsed < this.lastDuration;
  }
}

function getStyle(
  valToStyle: ValToStyle,
  easing: keyof typeof easings | null,
  val: number,
  duration: number,
  animatedVal: AnimatedValue,
): Style {
  const keys = TS.objKeys(valToStyle);
  const style = {} as ObjectOf<any>;

  for (const pair of TS.objEntries(valToStyle, true)) {
    const easedVal = animatedVal.finalVal !== animatedVal.startVal
      ? animatedVal.startVal
        + (easings[easing ?? 'easeOutCubic'].fn(
          Math.abs(val - animatedVal.startVal)
            / Math.abs(animatedVal.finalVal - animatedVal.startVal),
        ) * (animatedVal.finalVal - animatedVal.startVal))
      : val;
    // @ts-ignore union type that is too complex to represent
    style[pair[0]] = pair[1]?.(easedVal);
  }

  if (style.transform) {
    style.transform += ' translateZ(0)';
  } else {
    keys.push('transform');
    style.transform = 'translateZ(0)';
  }

  if (keys.length && duration) {
    style.transitionProperty = keys.map(k => styleDeclarationToCss(k)).join(',');
    style.transitionDuration = `${Math.round(duration)}ms`;
    style.transitionTimingFunction = easings[easing ?? 'easeOutCubic'].css;
  } else {
    style.transitionProperty = '';
    style.transitionDuration = '';
    style.transitionTimingFunction = '';
  }

  return style;
}

export function useAnimatedValue(defaultVal: number, debugName?: string) {
  return useConst(() => new AnimatedValue(defaultVal, debugName));
}

export function useAnimation<T extends HTMLElement>() {
  const animationRef = useRef<T | null>(null);
  const ref = useRef({
    hasInit: false,
    animatedVal: null as AnimatedValue | null,
    valToStyle: null as ValToStyle | null,
    easing: null as keyof typeof easings | null,
    keyframeVals: [] as number[],
    lastKeyframeVal: 0,
    hadFirstTransition: false,
    nextKeyframeTimer: null as number | null,
    nextKeyframeRaf: null as number | null,
  });

  const renderNextKeyframe = useCallback(() => {
    if (ref.current.nextKeyframeTimer !== null) {
      clearTimeout(ref.current.nextKeyframeTimer);
      ref.current.nextKeyframeTimer = null;
    }
    if (ref.current.nextKeyframeRaf !== null) {
      cancelAnimationFrame(ref.current.nextKeyframeRaf);
      ref.current.nextKeyframeRaf = null;
    }

    if (!animationRef.current
      || !ref.current.valToStyle
      || !ref.current.animatedVal
      || ref.current.animatedVal.getCurPercent() >= 1) {
      return;
    }

    if (!ref.current.hadFirstTransition) {
      // Force repaint.
      // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions
      animationRef.current.scrollTop;
      ref.current.hadFirstTransition = true;
    }

    const nextKeyframe = ref.current.animatedVal.getNextKeyframe(
      ref.current.keyframeVals,
      ref.current.lastKeyframeVal,
    );
    ref.current.lastKeyframeVal = nextKeyframe.val;

    const style = getStyle(
      ref.current.valToStyle,
      ref.current.easing,
      nextKeyframe.val,
      nextKeyframe.duration,
      ref.current.animatedVal,
    );
    for (const pair of TS.objEntries(style, true)) {
      if (pair[1] == null) {
        animationRef.current.style.removeProperty(styleDeclarationToCss(pair[0]));
      } else {
        animationRef.current.style.setProperty(
          styleDeclarationToCss(pair[0]),
          pair[1].toString(),
        );
      }
    }
    ref.current.animatedVal.didRender = true;

    if (!nextKeyframe.isFinal) {
      ref.current.nextKeyframeTimer = nextKeyframe.duration < MIN_TIMEOUT
        ? window.setTimeout(
          renderNextKeyframe,
          MIN_TIMEOUT,
        )
        : window.setTimeout(
          () => {
            ref.current.nextKeyframeRaf = requestAnimationFrame(renderNextKeyframe);
          },
          nextKeyframe.duration - (getFrameDuration() / 2),
        );
    }
  }, []);

  let nextKeyframe = ref.current.animatedVal?.getNextKeyframe(
    ref.current.keyframeVals,
    ref.current.lastKeyframeVal,
  ) ?? {
    val: 0,
    duration: 0,
    isFinal: true,
  };
  const animationStyle: AnimationStyle = useCallback((
    animatedVal,
    valToStyle,
    opts,
  ) => {
    if (!ref.current.hasInit) {
      ref.current.hasInit = true;
      animatedVal.listeners.add(renderNextKeyframe);

      ref.current.animatedVal = animatedVal;
      ref.current.valToStyle = valToStyle;
      ref.current.easing = opts?.easing ?? null;
      ref.current.keyframeVals = opts?.keyframes ?? [];
      ref.current.lastKeyframeVal = animatedVal.startVal;

      // eslint-disable-next-line react-hooks/exhaustive-deps
      nextKeyframe = ref.current.animatedVal
        .getNextKeyframe(
          ref.current.keyframeVals,
          ref.current.lastKeyframeVal,
        );
    } else if (!process.env.PRODUCTION && ref.current.animatedVal !== animatedVal) {
      throw new Error('animationStyle: animatedVal changed after init');
    }

    return getStyle(
      valToStyle,
      ref.current.easing,
      nextKeyframe.val,
      nextKeyframe.duration,
      animatedVal,
    ) as Style;
  }, []);

  useEffect(() => {
    ref.current.lastKeyframeVal = nextKeyframe.val;

    if (!nextKeyframe.isFinal
      && ref.current.nextKeyframeTimer === null
      && ref.current.nextKeyframeRaf === null
      && ref.current.animatedVal?.isAnimating()) {
      ref.current.nextKeyframeTimer = nextKeyframe.duration < MIN_TIMEOUT
        ? window.setTimeout(
          renderNextKeyframe,
          MIN_TIMEOUT,
        )
        : window.setTimeout(
          () => {
            ref.current.nextKeyframeRaf = requestAnimationFrame(renderNextKeyframe);
          },
          nextKeyframe.duration - (getFrameDuration() / 2),
        );
    }
  });

  useEffect(() => {
    ref.current.animatedVal?.listeners.add(renderNextKeyframe);

    return () => {
      ref.current.hasInit = false;
      ref.current.animatedVal?.listeners.delete(renderNextKeyframe);

      if (ref.current.nextKeyframeTimer !== null) {
        clearTimeout(ref.current.nextKeyframeTimer);
      }
      if (ref.current.nextKeyframeRaf !== null) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        cancelAnimationFrame(ref.current.nextKeyframeRaf);
      }
    };
  }, [renderNextKeyframe]);

  return [
    animationRef,
    animationStyle,
  ] as const;
}

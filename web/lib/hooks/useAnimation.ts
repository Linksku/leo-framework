import EventEmitter from 'wolfy87-eventemitter';

import styleDeclarationToCss from 'lib/styleDeclarationToCss';

const DEFAULT_DURATION = 200;

export type ValToStyle = Partial<{
  [k in keyof React.CSSProperties]: (x: number) => React.CSSProperties[k];
}>;

export type Style = Partial<React.CSSProperties>;

export type AnimationStyle = Memoed<(
  animatedVal: AnimatedValue,
  valToStyle: ValToStyle,
  keyframeVals?: number[],
) => Style>;

// todo: low/mid change eventemitter to something lightweight
export class AnimatedValue extends EventEmitter {
  private lastSetValTime = performance.now();
  private lastDuration = 0;
  private startVal: number;
  private finalVal: number;

  constructor(defaultVal: number) {
    super();
    this.startVal = defaultVal;
    this.finalVal = defaultVal;
  }

  getCurVal() {
    const elapsed = performance.now() - this.lastSetValTime;
    if (elapsed >= this.lastDuration) {
      return this.finalVal;
    }
    return this.startVal
      + ((this.finalVal - this.startVal) * (elapsed / this.lastDuration));
  }

  setVal(finalVal: number, duration = DEFAULT_DURATION) {
    if (duration < 0) {
      if (process.env.NODE_ENV !== 'production') {
        throw new Error(`AnimatedVal.setVal: invalid duration: ${duration}`);
      }
      duration = 0;
    }

    const curVal = this.getCurVal();
    const isAnimating = curVal !== this.finalVal;
    this.startVal = curVal;
    this.finalVal = finalVal;
    this.lastSetValTime = performance.now();
    this.lastDuration = duration;

    if (isAnimating || finalVal !== curVal) {
      this.emit('valChanged');
    }
  }

  getNextKeyframe(keyframeVals: number[]) {
    const curVal = this.getCurVal();
    const increasing = this.finalVal >= this.startVal;
    let nextKeyframeVal = this.finalVal;
    for (const val of keyframeVals) {
      if ((increasing && val > curVal && val < nextKeyframeVal)
        || (!increasing && val < curVal && val > nextKeyframeVal)) {
        nextKeyframeVal = val;
      }
    }

    const timeToNextKeyframe = this.lastDuration <= 0 || this.finalVal === this.startVal
      ? 0
      : Math.abs(
        (Math.abs((nextKeyframeVal - curVal) / (this.finalVal - this.startVal))
          * this.lastDuration)
        // Half a frame for RAF.
        - (1000 / 60 / 2),
      );
    return {
      val: nextKeyframeVal,
      time: timeToNextKeyframe,
      isFinal: nextKeyframeVal === this.finalVal,
    };
  }
}

function getStyle(valToStyle: ValToStyle, val: number, duration: number) {
  const keys = objectKeys(valToStyle);
  const style = {} as Style;

  if (keys.length) {
    style.transitionProperty = keys.map(k => styleDeclarationToCss(k)).join(',');
    style.transitionDuration = `${duration}ms`;
    style.transitionTimingFunction = 'ease-out';
  }

  for (const [k, v] of objectEntries(valToStyle, true)) {
    // @ts-ignore union type that is too complex to represent
    style[k] = v?.(val);
  }

  return style;
}

export function useAnimatedValue(defaultVal: number) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useRef(useMemo(() => new AnimatedValue(defaultVal), [])).current;
}

export function useAnimation<T extends HTMLElement>() {
  const animationRef = useRef<T | null>(null);
  const ref = useRef({
    hasInit: false,
    animatedVal: null as AnimatedValue | null,
    valToStyle: null as ValToStyle | null,
    keyframeVals: [] as number[],
    hadFirstTransition: false,
    nextKeyframeTimer: null as number | null,
  });

  const renderNextKeyframe = useCallback(() => {
    if (ref.current.nextKeyframeTimer) {
      clearTimeout(ref.current.nextKeyframeTimer);
      ref.current.nextKeyframeTimer = null;
    }

    requestAnimationFrame(() => {
      if (!animationRef.current || !ref.current.valToStyle || !ref.current.animatedVal) {
        return;
      }

      if (!ref.current.hadFirstTransition) {
        // Force repaint.
        // eslint-disable-next-line no-unused-expressions
        animationRef.current.scrollTop;
        ref.current.hadFirstTransition = true;
      }

      const nextKeyframe = ref.current.animatedVal.getNextKeyframe(ref.current.keyframeVals);

      const style = getStyle(
        ref.current.valToStyle,
        nextKeyframe.val,
        nextKeyframe.time,
      );
      for (const [k, v] of objectEntries(style)) {
        animationRef.current.style.setProperty(
          styleDeclarationToCss(k),
          v.toString(),
        );
      }

      if (!nextKeyframe.isFinal) {
        ref.current.nextKeyframeTimer = window.setTimeout(renderNextKeyframe, nextKeyframe.time);
      }
    });
  }, []);

  const animationStyle: AnimationStyle = useCallback((
    animatedVal,
    valToStyle,
    keyframeVals = [],
  ) => {
    if (!ref.current.hasInit) {
      ref.current.hasInit = true;
      animatedVal.on('valChanged', renderNextKeyframe);

      ref.current.animatedVal = animatedVal;
      ref.current.valToStyle = valToStyle;
      ref.current.keyframeVals = keyframeVals;
    }
    return getStyle(
      valToStyle,
      animatedVal.getCurVal(),
      0,
    ) as Partial<React.CSSProperties>;
  }, [renderNextKeyframe]);

  useEffect(
    () => () => {
      ref.current.animatedVal?.off('valChanged', renderNextKeyframe);
    },
    [renderNextKeyframe],
  );

  return [
    animationRef,
    animationStyle,
  ] as const;
}

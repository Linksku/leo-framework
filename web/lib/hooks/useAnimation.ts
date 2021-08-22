import EventEmitter from 'wolfy87-eventemitter';

import styleDeclarationToCss from 'lib/styleDeclarationToCss';
import getFrameDuration from 'lib/getFrameDuration';

const DEFAULT_DURATION = 200;

export type ValToStyle = Partial<{
  [k in keyof React.CSSProperties]: (x: number) => React.CSSProperties[k];
}>;

export type Style = Partial<React.CSSProperties>;

export type AnimationStyle = (
  animatedVal: AnimatedValue,
  valToStyle: ValToStyle,
  keyframeVals?: number[],
) => Style;

// todo: low/mid change eventemitter to something lightweight
export class AnimatedValue extends EventEmitter {
  lastSetValTime = performance.now();
  lastDuration = 0;
  startVal: number;
  finalVal: number;
  debugName: string;

  constructor(defaultVal: number, debugName?: string) {
    super();
    this.startVal = defaultVal;
    this.finalVal = defaultVal;
    this.debugName = debugName ?? '';
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

  getNextKeyframe(keyframeVals: number[], lastKeyframeVal: number) {
    const increasing = this.finalVal >= this.startVal;
    const curVal = increasing
      ? Math.min(lastKeyframeVal, this.getCurVal())
      : Math.max(lastKeyframeVal, this.getCurVal());
    let nextKeyframeVal = this.finalVal;
    for (const val of keyframeVals) {
      if ((increasing && val > curVal && val < nextKeyframeVal)
        || (!increasing && val < curVal && val > nextKeyframeVal)) {
        nextKeyframeVal = val;
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
    const elapsed = performance.now() - this.lastSetValTime;
    return elapsed >= this.lastDuration;
  }
}

function getStyle(valToStyle: ValToStyle, val: number, duration: number) {
  const keys = objectKeys(valToStyle);
  const style = {} as Style;

  if (keys.length) {
    style.transitionProperty = keys.map(k => styleDeclarationToCss(k)).join(',');
    style.transitionDuration = `${Math.round(duration)}ms`;
    style.transitionTimingFunction = 'ease-out';
  }

  for (const [k, v] of objectEntries(valToStyle, true)) {
    // @ts-ignore union type that is too complex to represent
    style[k] = v?.(val);
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
    keyframeVals: [] as number[],
    lastKeyframeVal: 0,
    hadFirstTransition: false,
    nextKeyframeTimer: null as number | null,
    nextKeyframeRaf: null as number | null,
  });

  const queueNextKeyframe = useCallback(() => {
    if (ref.current.nextKeyframeTimer !== null) {
      clearTimeout(ref.current.nextKeyframeTimer);
      ref.current.nextKeyframeTimer = null;
    }

    function renderNextKeyframe() {
      ref.current.nextKeyframeRaf = null;
      if (!animationRef.current || !ref.current.valToStyle || !ref.current.animatedVal) {
        return;
      }

      if (!ref.current.hadFirstTransition) {
        // Force repaint.
        // eslint-disable-next-line no-unused-expressions
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
        nextKeyframe.val,
        nextKeyframe.duration,
      );
      for (const [k, v] of objectEntries(style)) {
        animationRef.current.style.setProperty(
          styleDeclarationToCss(k),
          v.toString(),
        );
      }

      if (!nextKeyframe.isFinal) {
        if (nextKeyframe.duration < getFrameDuration() * 1.5) {
          queueNextKeyframe();
        } else {
          ref.current.nextKeyframeTimer = window.setTimeout(
            queueNextKeyframe,
            nextKeyframe.duration - (getFrameDuration() / 2),
          );
        }
      }
    }

    if (ref.current.nextKeyframeRaf === null) {
      ref.current.nextKeyframeRaf = requestAnimationFrame(renderNextKeyframe);
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
  const animationStyle: AnimationStyle = (
    animatedVal,
    valToStyle,
    keyframeVals = [],
  ) => {
    if (!ref.current.hasInit) {
      ref.current.hasInit = true;
      animatedVal.on('valChanged', queueNextKeyframe);

      ref.current.animatedVal = animatedVal;
      ref.current.valToStyle = valToStyle;
      ref.current.keyframeVals = keyframeVals;
      ref.current.lastKeyframeVal = animatedVal.startVal;

      nextKeyframe = ref.current.animatedVal.getNextKeyframe(
        ref.current.keyframeVals,
        ref.current.lastKeyframeVal,
      );
    }

    return getStyle(
      valToStyle,
      nextKeyframe.val,
      nextKeyframe.duration,
    ) as Partial<React.CSSProperties>;
  };

  useEffect(() => {
    ref.current.lastKeyframeVal = nextKeyframe.val;

    if (!nextKeyframe.isFinal
      && ref.current.nextKeyframeTimer === null
      && ref.current.nextKeyframeRaf === null
      && ref.current.animatedVal?.isAnimating()) {
      if (nextKeyframe.duration < getFrameDuration() * 1.5) {
        queueNextKeyframe();
      } else {
        ref.current.nextKeyframeTimer = window.setTimeout(
          queueNextKeyframe,
          nextKeyframe.duration - (getFrameDuration() / 2),
        );
      }
    }
  });

  useEffect(
    () => () => {
      ref.current.animatedVal?.off('valChanged', queueNextKeyframe);
    },
    [queueNextKeyframe],
  );

  return [
    animationRef,
    animationStyle,
  ] as const;
}

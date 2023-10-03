import styleDeclarationToCss from 'utils/styleDeclarationToCss';
import easings from 'utils/easings';
import useGetIsMounted from 'hooks/useGetIsMounted';

export const DEFAULT_DURATION = 300;

export const DEFAULT_EASING = 'easeInOutQuad';

type AnimatedValueOpts = {
  minVal?: number,
  maxVal?: number,
  debugName?: string,
};

type Keyframe = {
  val: number,
  duration: number,
  isFinal: boolean,
};

type ValToStyle = Partial<{
  [k in keyof React.CSSProperties]: (easedVal: number, val: number) => React.CSSProperties[k];
}>;

type Style = Partial<React.CSSProperties>;

export class AnimatedValue {
  minVal: number;
  maxVal: number;
  startVal: number;
  finalVal: number;
  debugName: string;
  lastSetValTime = Number.MIN_SAFE_INTEGER;
  lastDuration = 0;
  easing?: keyof typeof easings;
  listeners: Set<(prevKeyframe: Keyframe, newKeyframe: Keyframe) => void>;
  curKeyframe: Keyframe;
  timer: number | null = null;

  constructor(initialVal: number, opts?: AnimatedValueOpts) {
    this.minVal = opts?.minVal ?? 0;
    this.maxVal = opts?.maxVal ?? 100;
    this.startVal = initialVal;
    this.finalVal = initialVal;
    this.debugName = opts?.debugName ?? '';
    this.listeners = new Set();
    this.curKeyframe = {
      val: initialVal,
      duration: 0,
      isFinal: true,
    } as Keyframe;
  }

  getCurPercent() {
    if (this.lastSetValTime === Number.MIN_SAFE_INTEGER) {
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

  isAnimating() {
    if (this.lastSetValTime === Number.MIN_SAFE_INTEGER) {
      return false;
    }
    const elapsed = performance.now() - this.lastSetValTime;
    return elapsed < this.lastDuration;
  }

  // todo: low/mid animation easing with keyframes
  getNextKeyframe(keyframeVals: number[], lastKeyframeVal: number | null): Keyframe {
    const increasing = this.finalVal >= this.startVal;
    const curVal = lastKeyframeVal != null
      ? (increasing
        ? Math.min(lastKeyframeVal, this.getCurVal())
        : Math.max(lastKeyframeVal, this.getCurVal()))
      : this.getCurVal();
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

  addListener(fn: (prevKeyframe: Keyframe, newKeyframe: Keyframe) => void) {
    this.listeners.add(fn);

    return () => {
      this.listeners.delete(fn);
    };
  }

  renderKeyframe() {
    const newKeyframe = this.getNextKeyframe(
      [this.minVal, this.maxVal],
      null,
    );
    for (const fn of this.listeners) {
      fn(this.curKeyframe, newKeyframe);
    }

    // Render last keyframe twice for stylesForFinalVal
    if (!this.curKeyframe.isFinal) {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = setTimeout(() => {
        this.renderKeyframe();
        this.timer = null;
      }, newKeyframe.duration);
    }

    this.curKeyframe = newKeyframe;
  }

  setVal(finalVal: number, duration?: number, easing?: keyof typeof easings) {
    if (duration && duration < 0) {
      if (!process.env.PRODUCTION) {
        throw new Error(`AnimatedVal.setVal(${this.debugName}): invalid duration: ${duration}`);
      }
      duration = 0;
    }
    if (finalVal === this.finalVal && (duration == null || duration === this.lastDuration)) {
      return;
    }

    const curVal = this.getCurVal();
    this.startVal = curVal;
    this.finalVal = finalVal;
    this.lastSetValTime = performance.now();
    this.lastDuration = duration ?? DEFAULT_DURATION;
    this.easing = easing;
    this.curKeyframe = {
      val: curVal,
      duration: 0,
      isFinal: false,
    };

    this.renderKeyframe();
  }
}

function getStyles(
  animatedVal: AnimatedValue,
  valToStyle: ValToStyle,
  defaultEasing: keyof typeof easings,
  skipTransitionProps: string[] | null,
  keyframe: Keyframe,
): {
  styles: Style,
  transitionStyles: Style,
} {
  const easing = animatedVal.easing ?? defaultEasing;

  const styles = {} as ObjectOf<any>;
  for (const pair of TS.objEntries(valToStyle, true)) {
    const easedVal = animatedVal.finalVal !== animatedVal.startVal
      ? animatedVal.startVal
        + (easings[easing].fn(
          Math.abs(keyframe.val - animatedVal.startVal)
            / Math.abs(animatedVal.finalVal - animatedVal.startVal),
        ) * (animatedVal.finalVal - animatedVal.startVal))
      : keyframe.val;
    // "as any" for perf
    styles[pair[0]] = (pair[1] as any)?.(easedVal, keyframe.val);
  }

  if (styles.transform) {
    if (!styles.transform.includes('translateZ(')) {
      styles.transform += ' translateZ(0)';
    }
  } else {
    styles.transform = 'translateZ(0)';
  }

  const styleKeys = TS.objKeys(styles);
  const transitionStyles = {
    transitionProperty: styleKeys.length
      ? styleKeys
        .filter(k => !skipTransitionProps?.includes(k))
        .map(k => styleDeclarationToCss(k)).join(', ')
      : undefined,
    transitionDuration: keyframe.duration
      ? `${Math.round(keyframe.duration)}ms`
      : undefined,
    transitionTimingFunction: easings[easing].css,
  };

  return {
    styles,
    transitionStyles,
  };
}

export function useAnimatedValue(initialVal: number, opts?: AnimatedValueOpts) {
  return useConst(() => new AnimatedValue(initialVal, opts));
}

export function useAnimation<T extends HTMLElement>(
  animatedVal: Stable<AnimatedValue>,
  debugName: string,
) {
  const animationRef = useRef<T | null>(null);
  const ref = useRef({
    hasInit: false,
    valToStyle: null as ValToStyle | null,
    stylesForFinalVal: null as ObjectOf<Style> | null,
    defaultEasing: DEFAULT_EASING as keyof typeof easings,
    keyframeVals: [] as number[],
    skipTransitionProps: null as string[] | null,
    hasCommited: false,
    hadFirstTransition: false,
    lastRenderedKeyframe: animatedVal.curKeyframe,
  });

  const animationStyle = useCallback((
    valToStyle: ValToStyle,
    opts?: {
      stylesForFinalVal?: ObjectOf<Style>,
      defaultEasing?: keyof typeof easings | null,
      // Note: keyframes is choppy if thread is blocked
      // todo: low/mid replace with css keyframes
      keyframes?: number[],
      skipTransitionProps?: string[],
    },
  ): Style => {
    if (!ref.current.hasInit) {
      ref.current = {
        ...ref.current,
        hasInit: true,
        valToStyle,
        stylesForFinalVal: opts?.stylesForFinalVal ?? null,
        defaultEasing: opts?.defaultEasing ?? DEFAULT_EASING,
        keyframeVals: opts?.keyframes ?? [],
        skipTransitionProps: opts?.skipTransitionProps ?? null,
        lastRenderedKeyframe: animatedVal.isAnimating()
          ? {
            val: animatedVal.getCurVal(),
            duration: animatedVal.curKeyframe.duration,
            isFinal: false,
          }
          : animatedVal.curKeyframe,
      };
    }
    ref.current.hasCommited = false;

    const { styles, transitionStyles } = getStyles(
      animatedVal,
      valToStyle,
      ref.current.defaultEasing,
      ref.current.skipTransitionProps,
      ref.current.lastRenderedKeyframe,
    );
    const additionalStyles = ref.current.stylesForFinalVal !== null
      && !animatedVal.isAnimating()
      && ref.current.stylesForFinalVal[animatedVal.getCurVal()]
      ? ref.current.stylesForFinalVal[animatedVal.getCurVal()]
      : null;
    return {
      ...transitionStyles,
      ...styles,
      ...additionalStyles,
    } as Style;
  }, [animatedVal]);

  const getIsMounted = useGetIsMounted();
  const handleVal = useCallback((prevKeyframe: Keyframe, newKeyframe: Keyframe) => {
    const {
      valToStyle,
      hadFirstTransition,
      defaultEasing,
      skipTransitionProps,
      hasCommited,
      stylesForFinalVal,
      lastRenderedKeyframe,
    } = ref.current;
    const animationElem = animationRef.current;

    if (
      // If setProperty runs before commit, concurrent mode can revert it
      !hasCommited
      || !animationElem
      || !valToStyle
      || lastRenderedKeyframe === newKeyframe) {
      return;
    }
    if (!getIsMounted()) {
      if (!process.env.PRODUCTION) {
        ErrorLogger.warn(new Error(`useAnimation(${debugName}): not mounted`));
      }
      return;
    }
    if (newKeyframe.val === prevKeyframe.val) {
      const additionalStyles = stylesForFinalVal?.[newKeyframe.val];
      if (additionalStyles
        && !animatedVal.isAnimating()) {
        for (const pair of TS.objEntries(additionalStyles)) {
          animationElem.style.setProperty(
            styleDeclarationToCss(pair[0]),
            pair[1].toString(),
          );
        }
      }
      ref.current.lastRenderedKeyframe = newKeyframe;
      return;
    }

    if (!hadFirstTransition) {
      if (!process.env.PRODUCTION && !valToStyle.transform) {
        const curTransform = animationElem.style.transform;
        animationElem.style.removeProperty('transform');
        const cssTransform = getComputedStyle(animationElem).getPropertyValue('transform');
        if (cssTransform && cssTransform !== 'none') {
          ErrorLogger.warn(new Error(`useAnimation(${debugName}): transform will be overridden`));
        }
        animationElem.style.transform = curTransform;
      }

      ref.current.hadFirstTransition = true;
    }

    const removeStyles = stylesForFinalVal !== null
      && stylesForFinalVal[prevKeyframe.val]
      && newKeyframe.val !== prevKeyframe.val
      ? stylesForFinalVal[prevKeyframe.val]
      : null;
    if (removeStyles) {
      for (const pair of TS.objEntries(removeStyles)) {
        animationElem.style.removeProperty(styleDeclarationToCss(pair[0]));
      }

      if (removeStyles.display) {
        // Force repaint.
        // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions
        animationElem.scrollTop;
      }
    }

    const { styles, transitionStyles } = getStyles(
      animatedVal,
      valToStyle,
      defaultEasing,
      skipTransitionProps,
      newKeyframe,
    );
    let didUpdateTransitions = false;
    for (const pair of TS.objEntries(transitionStyles)) {
      const key = styleDeclarationToCss(pair[0]);
      const val = pair[1].toString();
      if (didUpdateTransitions || val !== animationElem.style.getPropertyValue(key)) {
        animationElem.style.setProperty(key, val);
        didUpdateTransitions = true;
      }
    }
    if (didUpdateTransitions) {
      // Force repaint.
      // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions
      animationElem.scrollTop;
    }
    for (const pair of TS.objEntries(styles, true)) {
      if (pair[1] == null) {
        animationElem.style.removeProperty(styleDeclarationToCss(pair[0]));
      } else {
        animationElem.style.setProperty(
          styleDeclarationToCss(pair[0]),
          pair[1].toString(),
        );
      }
    }

    ref.current.lastRenderedKeyframe = newKeyframe;
  }, [animatedVal, debugName, getIsMounted]);

  useLayoutEffect(() => {
    ref.current.hasCommited = true;

    if (ref.current.lastRenderedKeyframe.val !== animatedVal.curKeyframe.val) {
      handleVal(ref.current.lastRenderedKeyframe, animatedVal.curKeyframe);
    }
  });

  useEffect(() => {
    const unsub = animatedVal.addListener(handleVal);
    return unsub;
  }, [animatedVal, handleVal]);

  return [
    animationRef,
    animationStyle,
  ] as const;
}

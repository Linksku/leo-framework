import styleDeclarationToCss from 'utils/styleDeclarationToCss';
import easings from 'utils/easings';
import useGetIsMounted from 'hooks/useGetIsMounted';

export const DEFAULT_DURATION = 300;

export const DEFAULT_EASING = 'easeInOutQuad';

type AnimatedValueOpts = {
  minVal?: number | null,
  maxVal?: number | null,
  initialDuration?: number,
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
  minVal: number | null;
  maxVal: number | null;
  startVal: number;
  finalVal: number;
  debugName: string;
  curKeyframe: Keyframe;
  lastSetValTime = Number.MIN_SAFE_INTEGER;
  easing?: keyof typeof easings;
  listeners: Set<(prevKeyframe: Keyframe, newKeyframe: Keyframe) => void>;
  timer: number | null = null;

  constructor(initialVal: number, opts?: AnimatedValueOpts) {
    this.minVal = opts?.minVal === null ? null : (opts?.minVal ?? 0);
    this.maxVal = opts?.maxVal === null ? null : (opts?.maxVal ?? 100);
    this.startVal = initialVal;
    this.finalVal = initialVal;
    this.debugName = opts?.debugName ?? '';
    this.curKeyframe = {
      val: initialVal,
      duration: opts?.initialDuration ?? DEFAULT_DURATION,
      isFinal: true,
    } as Keyframe;
    this.listeners = new Set();
  }

  getCurPercent() {
    if (this.lastSetValTime === Number.MIN_SAFE_INTEGER) {
      return 0;
    }
    const elapsed = performance.now() - this.lastSetValTime;
    if (elapsed >= this.curKeyframe.duration) {
      return 1;
    }
    return elapsed / this.curKeyframe.duration;
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
    return elapsed < this.curKeyframe.duration;
  }

  // todo: low/mid animation easing with keyframes
  getNextKeyframe(
    keyframeVals: number[],
    // lastKeyframeVal is for stepped animations, it's different from Keyframe.val
    lastKeyframeVal: number | null,
  ): Keyframe {
    if (this.curKeyframe.isFinal && !this.isAnimating()) {
      // useAnimation renders each keyframe at most once,
      //   but can render the same value multiple times.
      //   E.g. once to get to 100%, then once to update styles at 100%.
      return { ...this.curKeyframe };
    }

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

    const timeToNextKeyframe = this.curKeyframe.duration <= 0
      || this.finalVal === this.startVal
      ? 0
      : Math.round(Math.max(
        0,
        Math.abs((nextKeyframeVal - curVal) / (this.finalVal - this.startVal))
        * this.curKeyframe.duration,
      ));
    return {
      val: nextKeyframeVal,
      duration: timeToNextKeyframe,
      isFinal: nextKeyframeVal === this.finalVal,
    };
  }

  renderKeyframe() {
    const prevKeyframe = this.curKeyframe;
    const newKeyframe = this.getNextKeyframe(
      TS.filterNulls([this.minVal, this.maxVal]),
      null,
    );
    for (const fn of this.listeners) {
      fn(this.curKeyframe, newKeyframe);
    }
    this.curKeyframe = newKeyframe;

    // Render last keyframe twice for stylesForFinalVal
    if (!prevKeyframe.isFinal) {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = window.setTimeout(() => {
        this.renderKeyframe();
        this.timer = null;
      }, newKeyframe.duration);
    }
  }

  setVal(finalVal: number, duration?: number, easing?: keyof typeof easings) {
    if (duration && duration < 0) {
      if (!process.env.PRODUCTION) {
        throw new Error(`AnimatedVal.setVal(${this.debugName}): invalid duration: ${duration}`);
      }
      duration = 0;
    }
    if (this.minVal && finalVal < this.minVal) {
      if (!process.env.PRODUCTION) {
        throw new Error(`AnimatedVal.setVal(${this.debugName}): finalVal < minVal: ${finalVal}`);
      }
      finalVal = this.minVal;
    }
    if (this.maxVal && finalVal > this.maxVal) {
      if (!process.env.PRODUCTION) {
        throw new Error(`AnimatedVal.setVal(${this.debugName}): finalVal > maxVal: ${finalVal}`);
      }
      finalVal = this.maxVal;
    }
    const curVal = this.getCurVal();
    if (finalVal === this.finalVal && finalVal === curVal) {
      return;
    }

    this.startVal = curVal;
    this.finalVal = finalVal;
    this.curKeyframe = {
      val: curVal,
      duration: duration ?? DEFAULT_DURATION,
      isFinal: curVal === finalVal && !this.timer,
    };
    this.lastSetValTime = performance.now();
    this.easing = easing;

    this.renderKeyframe();
  }

  addListener(fn: (prevKeyframe: Keyframe, newKeyframe: Keyframe) => void) {
    this.listeners.add(fn);

    return () => {
      this.listeners.delete(fn);
    };
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
  transitionStyles: {
    transitionProperty: string | undefined,
    transitionDuration: string | undefined,
    transitionTimingFunction: string | undefined,
  },
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
    // "as AnyFunction" for perf
    styles[pair[0]] = (pair[1] as AnyFunction)?.(
      easedVal,
      keyframe.val,
    );
  }

  if (styles.transform) {
    if (typeof styles.transform === 'string' && !styles.transform.includes('translateZ(')) {
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

function paintStyles(elem: HTMLElement, styles: Style) {
  for (const pair of TS.objEntries(styles, true)) {
    if (pair[1] == null) {
      elem.style.removeProperty(styleDeclarationToCss(pair[0]));
    } else {
      elem.style.setProperty(
        styleDeclarationToCss(pair[0]),
        pair[1].toString(),
      );
    }
  }
}

export function useAnimatedValue(
  initialVal: number,
  opts?: AnimatedValueOpts,
) {
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
    hadFirstPaint: false,
    hadFirstTransition: false,
    lastRenderedKeyframe: animatedVal.curKeyframe,
    paintRaf: null as number | null,
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
      paintRaf,
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

    if (!process.env.PRODUCTION && !hadFirstTransition && !valToStyle.transform) {
      const curTransform = animationElem.style.transform;
      animationElem.style.removeProperty('transform');
      const cssTransform = getComputedStyle(animationElem).getPropertyValue('transform');
      if (cssTransform && cssTransform !== 'none') {
        ErrorLogger.warn(new Error(`useAnimation(${debugName}): transform will be overridden`));
      }
      animationElem.style.transform = curTransform;
    }

    if (newKeyframe.val === prevKeyframe.val) {
      // After animation completes, runs handleVal again with the same val to set stylesForFinalVal
      const additionalStyles = stylesForFinalVal?.[newKeyframe.val];
      // Note: it's possible that newKeyframe.isFinal = true and animatedVal.isAnimating() = true
      if (additionalStyles && newKeyframe.isFinal) {
        if (paintRaf) {
          cancelAnimationFrame(paintRaf);
          ref.current.paintRaf = null;
        }
        paintStyles(animationElem, additionalStyles);
      }

      if (prevKeyframe === lastRenderedKeyframe
        && newKeyframe.duration === prevKeyframe.duration) {
        ref.current.lastRenderedKeyframe = newKeyframe;
        return;
      }

      // This can prob be ignored and removed
      if (!process.env.PRODUCTION && prevKeyframe.duration !== lastRenderedKeyframe.duration) {
        ErrorLogger.warn(
          new Error(`useAnimation(${debugName}): prevKeyframe !== lastRenderedKeyframe`),
          { prevKeyframe, lastRenderedKeyframe },
        );
      }
    } else {
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
          ref.current.hadFirstPaint = true;
        }
      }
    }

    const { styles, transitionStyles } = getStyles(
      animatedVal,
      valToStyle,
      defaultEasing,
      skipTransitionProps,
      newKeyframe,
    );
    // eslint-disable-next-line unicorn/consistent-destructuring
    let needForcePaint = !ref.current.hadFirstPaint;
    for (const pair of TS.objEntries(transitionStyles)) {
      const key = styleDeclarationToCss(pair[0]);
      const val = pair[1].toString();
      if (needForcePaint || val !== animationElem.style.getPropertyValue(key)) {
        animationElem.style.setProperty(key, val);
        needForcePaint = true;
      }
    }
    if (paintRaf) {
      cancelAnimationFrame(paintRaf);
    }
    if (needForcePaint) {
      // Force repaint.
      // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions
      animationElem.scrollTop;

      paintStyles(animationElem, styles);
    } else {
      // Chrome seems to drop frames automatically, but FF needs RAF
      ref.current.paintRaf = requestAnimationFrame(() => {
        paintStyles(animationElem, styles);
      });
    }

    ref.current.lastRenderedKeyframe = newKeyframe;
    ref.current.hadFirstPaint = true;
    ref.current.hadFirstTransition = true;
  }, [animatedVal, debugName, getIsMounted]);

  useLayoutEffect(() => {
    ref.current.hasCommited = true;

    if (ref.current.lastRenderedKeyframe !== animatedVal.curKeyframe) {
      // For when handleVal bailed because !hasCommited
      handleVal(ref.current.lastRenderedKeyframe, animatedVal.curKeyframe);
    }
  });

  useEffect(() => {
    // After first paint: https://github.com/facebook/react/issues/20863#issuecomment-940156386
    requestAnimationFrame(() => {
      setTimeout(() => {
        ref.current.hadFirstPaint = true;
      }, 0);
    });
  }, []);

  useEffect(() => {
    if (ref.current.lastRenderedKeyframe !== animatedVal.curKeyframe) {
      // For when setVal was called before addListener
      handleVal(ref.current.lastRenderedKeyframe, animatedVal.curKeyframe);
    }

    const unsub = animatedVal.addListener(handleVal);
    return unsub;
  }, [animatedVal, handleVal]);

  return [
    animationRef,
    animationStyle,
  ] as const;
}

import styleDeclarationToCss from 'utils/styleDeclarationToCss';
import easings from 'utils/easings';
import useGetIsMounted from 'utils/useGetIsMounted';
import { needsRafForAnimations } from 'core/browserHacks/browserHackGatings';
import isDebug from 'utils/isDebug';

export const DEFAULT_DURATION = 250;

export const DEFAULT_EASING = 'easeOutQuad';

type AnimatedValueOpts = {
  minVal?: number | null,
  maxVal?: number | null,
  defaultDuration?: number,
  debugName?: string,
};

type Keyframe = {
  val: number,
  duration: number,
  easing?: 'none' | keyof typeof easings,
  inGesture: boolean,
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
  defaultDuration: number;
  duration: number;
  debugName: string;
  curKeyframe: Keyframe;
  lastSetValTime = Number.MIN_SAFE_INTEGER;
  listeners: Set<(prevKeyframe: Keyframe, newKeyframe: Keyframe) => void>;
  timer: number | null = null;

  constructor(initialVal: number, opts?: AnimatedValueOpts) {
    this.minVal = opts?.minVal === null ? null : (opts?.minVal ?? 0);
    this.maxVal = opts?.maxVal === null ? null : (opts?.maxVal ?? 100);
    this.startVal = initialVal;
    this.finalVal = initialVal;
    this.duration = this.defaultDuration = opts?.defaultDuration ?? DEFAULT_DURATION;
    this.debugName = opts?.debugName ?? '';
    this.curKeyframe = {
      val: initialVal,
      duration: this.duration,
      inGesture: false,
      isFinal: true,
    } satisfies Keyframe;
    this.listeners = new Set();
  }

  getCurVal() {
    if (this.lastSetValTime === Number.MIN_SAFE_INTEGER) {
      return this.startVal;
    }

    const elapsed = performance.now() - this.lastSetValTime;
    const curPercent = elapsed >= this.curKeyframe.duration
      ? 1
      : elapsed / this.curKeyframe.duration;

    return this.startVal
      + ((this.finalVal - this.startVal) * curPercent);
  }

  isAnimating() {
    return performance.now() - this.lastSetValTime < this.curKeyframe.duration;
  }

  // todo: low/med animation easing with keyframes
  getNextKeyframe(
    keyframeVals: number[] | null,
    // lastKeyframeVal is for stepped animations, it's different from Keyframe.val
    lastKeyframeVal: number | null,
    inGesture: boolean,
  ): Keyframe {
    if (this.curKeyframe.isFinal && !this.isAnimating()) {
      // useAnimation renders each keyframe at most once,
      //   but can render the same value multiple times.
      //   E.g. once to get to 100%, then once to update styles at 100%.
      return { ...this.curKeyframe };
    }

    const increasing = this.finalVal >= this.startVal;
    let curVal;
    if (!inGesture) {
      curVal = this.startVal;
    } else if (lastKeyframeVal != null) {
      curVal = increasing
        ? Math.min(lastKeyframeVal, this.getCurVal())
        : Math.max(lastKeyframeVal, this.getCurVal());
    } else {
      curVal = this.getCurVal();
    }

    let nextKeyframeVal = this.finalVal;
    if (keyframeVals && this.isAnimating()) {
      for (const val of keyframeVals) {
        if ((increasing && val > curVal && val < nextKeyframeVal)
          || (!increasing && val < curVal && val > nextKeyframeVal)) {
          nextKeyframeVal = val;
        }
      }
    }

    const timeToNextKeyframe = this.duration <= 0
      || this.finalVal === this.startVal
      ? 0
      : Math.round(
        Math.abs((nextKeyframeVal - curVal) / (this.finalVal - this.startVal))
          * this.duration,
      );
    return {
      val: nextKeyframeVal,
      duration: timeToNextKeyframe,
      easing: this.curKeyframe.easing,
      inGesture,
      isFinal: nextKeyframeVal === this.finalVal,
    };
  }

  renderKeyframe(inGesture: boolean) {
    const prevKeyframe = this.curKeyframe;
    const newKeyframe = this.getNextKeyframe(
      TS.filterNulls([this.minVal, this.maxVal]),
      null,
      inGesture,
    );
    for (const fn of this.listeners) {
      fn(prevKeyframe, newKeyframe);
    }
    this.curKeyframe = newKeyframe;

    // Render last keyframe twice for stylesForFinalVal
    if (!prevKeyframe.isFinal
      && (!newKeyframe.isFinal
        // Check keyframeVals if it's used again
        || newKeyframe.val === this.minVal
        || newKeyframe.val === this.maxVal)) {
      if (this.timer) {
        clearTimeout(this.timer);
      }
      this.timer = window.setTimeout(() => {
        this.renderKeyframe(false);
        this.timer = null;
      }, newKeyframe.duration);
    }
  }

  setVal(finalVal: number, duration?: number, easing?: 'none' | keyof typeof easings) {
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

    const inGesture = curVal !== this.finalVal
      && finalVal !== this.minVal
      && finalVal !== this.maxVal;
    this.startVal = curVal;
    this.finalVal = finalVal;
    this.duration = duration ?? this.defaultDuration;
    this.curKeyframe = {
      val: curVal,
      duration: this.duration,
      easing,
      inGesture,
      isFinal: curVal === finalVal && !this.timer,
    };
    this.lastSetValTime = performance.now();

    this.renderKeyframe(inGesture);
  }

  addListener(fn: (prevKeyframe: Keyframe, newKeyframe: Keyframe) => void) {
    this.listeners.add(fn);

    return () => {
      this.listeners.delete(fn);
    };
  }
}

function getStyles({
  animatedVal,
  valToStyle,
  stylesForFinalVal,
  defaultEasing,
  skipTransitionProps,
  keyframe,
}: {
  animatedVal: AnimatedValue,
  valToStyle: ValToStyle,
  stylesForFinalVal: ObjectOf<Style> | null,
  defaultEasing: 'none' | keyof typeof easings,
  skipTransitionProps: string[] | null,
  keyframe: Keyframe,
}): {
  styles: Style,
  transitionStyles: {
    transitionProperty: string,
    transitionDuration?: string,
    transitionTimingFunction?: string,
    willChange: string,
  },
} {
  const easing = keyframe.easing ?? defaultEasing;
  const styles = Object.create(null);
  // "AnyFunction" for TS perf
  for (const pair of (Object.entries(valToStyle) as [string, AnyFunction][])) {
    const totalDelta = animatedVal.finalVal - animatedVal.startVal;
    const easedVal = totalDelta
      && easing !== 'none'
      && easing !== 'linear'
      && keyframe.val !== animatedVal.finalVal
      ? animatedVal.startVal + (
        easings[easing].fn(Math.abs(
          (keyframe.val - animatedVal.startVal)
          / totalDelta,
        ))
          * totalDelta
      )
      : keyframe.val;
    styles[pair[0]] = pair[1](
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
  // FF transitions will jitter a lot without will-change: transition-duration
  const willChange = [
    'transition-property',
    'transition-duration',
    'transition-timing-function',
    ...styleKeys,
  ];
  if (stylesForFinalVal !== null) {
    const additionalStyles = stylesForFinalVal[keyframe.val];
    if (additionalStyles) {
      willChange.push(...TS.objKeys(additionalStyles));
    }
  }

  let transitionStyles: {
    transitionProperty: string,
    transitionDuration?: string,
    transitionTimingFunction?: string,
    willChange: string,
  };
  if (easing === 'none') {
    transitionStyles = {
      transitionProperty: 'none',
      willChange: willChange.join(', '),
    };
  } else {
    const transitionProperty = styleKeys.length
      ? (skipTransitionProps
        ? styleKeys.filter(k => !skipTransitionProps.includes(k))
        : styleKeys)
        .map(k => styleDeclarationToCss(k))
        .join(', ')
      : 'none';
    transitionStyles = {
      transitionProperty,
      transitionDuration: `${Math.round(keyframe.duration)}ms`,
      transitionTimingFunction: easings[easing].css,
      willChange: willChange.join(', '),
    };
  }
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
  const ref = useRef(useMemo(() => ({
    hasInit: false,
    valToStyle: null as ValToStyle | null,
    stylesForFinalVal: null as ObjectOf<Style> | null,
    defaultEasing: DEFAULT_EASING as 'none' | keyof typeof easings,
    keyframeVals: null as number[] | null,
    skipTransitionProps: null as string[] | null,
    hasCommitted: false,
    hadFirstPaint: false,
    hadFirstTransition: false,
    lastRenderedKeyframe: animatedVal.curKeyframe,
    paintRaf: null as number | null,
  }), [animatedVal]));

  const animationStyle = useCallback((
    valToStyle: ValToStyle,
    opts?: {
      stylesForFinalVal?: ObjectOf<Style>,
      defaultEasing?: 'none' | keyof typeof easings | null,
      // Note: keyframes is choppy if thread is blocked
      // todo: low/med replace with css keyframes
      keyframes?: number[],
      skipTransitionProps?: string[],
    },
  ): Style => {
    if (!ref.current.hasInit) {
      ref.current = markStable({
        ...ref.current,
        hasInit: true,
        valToStyle,
        stylesForFinalVal: opts?.stylesForFinalVal ?? null,
        defaultEasing: opts?.defaultEasing ?? DEFAULT_EASING,
        keyframeVals: opts?.keyframes ?? null,
        skipTransitionProps: opts?.skipTransitionProps ?? null,
        lastRenderedKeyframe: animatedVal.isAnimating()
          ? {
            ...animatedVal.curKeyframe,
            val: animatedVal.getCurVal(),
            isFinal: false,
          }
          : animatedVal.curKeyframe,
      });
    }
    ref.current.hasCommitted = false;

    const { styles, transitionStyles } = getStyles({
      animatedVal,
      valToStyle,
      stylesForFinalVal: ref.current.stylesForFinalVal,
      defaultEasing: ref.current.defaultEasing,
      skipTransitionProps: ref.current.skipTransitionProps,
      keyframe: ref.current.lastRenderedKeyframe,
    });

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
      hasCommitted,
      stylesForFinalVal,
      lastRenderedKeyframe,
      paintRaf,
    } = ref.current;
    const animationElem = animationRef.current;

    if (!animationElem
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

    if (!process.env.PRODUCTION && isDebug && !hadFirstTransition && !valToStyle.transform) {
      const curTransform = animationElem.style.transform;
      animationElem.style.removeProperty('transform');
      const cssTransform = window.getComputedStyle(animationElem).getPropertyValue('transform');
      if (cssTransform
        && cssTransform !== 'none'
        && cssTransform !== 'matrix(1, 0, 0, 1, 0, 0)') {
        ErrorLogger.warn(new Error(`useAnimation(${debugName}): transform will be overridden`));
      }
      animationElem.style.transform = curTransform;
    }

    if (newKeyframe.val === prevKeyframe.val && !paintRaf) {
      // After animation completes, runs handleVal again with the same val to set stylesForFinalVal
      const additionalStyles = stylesForFinalVal?.[newKeyframe.val];
      // Note: it's possible that newKeyframe.isFinal = true and animatedVal.isAnimating() = true
      if (additionalStyles && newKeyframe.isFinal) {
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
    } else if (stylesForFinalVal !== null) {
      const removeStyles = stylesForFinalVal[prevKeyframe.val]
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

    const { styles, transitionStyles } = getStyles({
      animatedVal,
      valToStyle,
      stylesForFinalVal,
      defaultEasing,
      skipTransitionProps,
      keyframe: newKeyframe,
    });
    // eslint-disable-next-line unicorn/consistent-destructuring
    const needForcePaint = !ref.current.hadFirstPaint;
    for (const pair of TS.objEntries(transitionStyles)) {
      const key = styleDeclarationToCss(pair[0]);
      const val = pair[1].toString();
      if (needForcePaint || val !== animationElem.style.getPropertyValue(key)) {
        animationElem.style.setProperty(key, val);
      }
    }
    if (needForcePaint) {
      // Force repaint.
      // eslint-disable-next-line no-unused-expressions, @typescript-eslint/no-unused-expressions
      animationElem.scrollTop;
    }

    const hadRaf = !!paintRaf;
    if (paintRaf) {
      cancelAnimationFrame(paintRaf);
      ref.current.paintRaf = null;
    }
    if (
      hadRaf
      // If setProperty runs before commit, concurrent mode can revert it
      || !hasCommitted
      || (newKeyframe.inGesture && needsRafForAnimations())
    ) {
      // Chrome seems to drop frames automatically, but FF needs RAF
      // todo: med/hard FF animations flicker again
      ref.current.paintRaf = requestAnimationFrame(() => {
        paintStyles(animationElem, styles);
        ref.current.paintRaf = null;
      });
    } else {
      paintStyles(animationElem, styles);
    }

    ref.current.lastRenderedKeyframe = newKeyframe;
    ref.current.hadFirstPaint = true;
    ref.current.hadFirstTransition = true;
  }, [animatedVal, debugName, getIsMounted]);

  useLayoutEffect(() => {
    // Doesn't work when unsuspending: https://stackoverflow.com/q/78804860/599184
    ref.current.hasCommitted = true;

    if (ref.current.lastRenderedKeyframe !== animatedVal.curKeyframe) {
      // For when handleVal bailed because !hasCommitted
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

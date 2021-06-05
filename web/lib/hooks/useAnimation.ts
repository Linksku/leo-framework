import EventEmitter from 'wolfy87-eventemitter';

import styleDeclarationToCss from 'lib/styleDeclarationToCss';

const DEFAULT_DURATION = 200;

export type AnimatedValueProps = {
  defaultValue: number,
  onComplete?: (val: number) => void,
};

export type PropsToStyle = {
  [k in keyof React.CSSProperties]: (x: number) => React.CSSProperties[k];
};

export type AnimationStyle = (
  animatedValue: AnimatedValue,
  propsToStyle: PropsToStyle,
) => React.CSSProperties;

// todo: low/mid change eventemitter to something lightweight
export class AnimatedValue extends EventEmitter {
  value: number;
  duration = DEFAULT_DURATION;

  constructor({
    defaultValue,
    onComplete,
  }: AnimatedValueProps) {
    super();
    this.value = defaultValue;
    if (onComplete) {
      this.on('complete', () => onComplete(this.value));
    }
  }
}

function getStyle(propsToStyle: PropsToStyle, value: number, duration: number) {
  const keys = Object.keys(propsToStyle) as (keyof React.CSSProperties)[];
  const style = {} as React.CSSProperties;

  if (keys.length) {
    style.transitionProperty = keys.map(k => styleDeclarationToCss(k)).join(',');
    style.transitionDuration = `${duration}ms`;
    style.transitionTimingFunction = 'ease-out';
  }
  for (const k of Object.keys(propsToStyle)) {
    style[k] = propsToStyle[k](value);
  }

  return style;
}

export function useAnimatedValue(props: AnimatedValueProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const val = useMemo(() => new AnimatedValue(props), []);
  const timerRef = useRef(null as number | null);

  const setValue = useCallback((newValue: number, duration = DEFAULT_DURATION) => {
    val.value = newValue;
    val.duration = duration;
    val.emit('setValue', newValue, duration);

    if (duration <= 0) {
      val.emit('complete', newValue);
    } else {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        val.emit('complete', newValue);
      }, duration);
    }
  }, [val]);
  return [val, setValue] as const;
}

export function useAnimation<T extends HTMLElement>() {
  const animationRef = useRef<T | null>(null);
  const ref = useRef({
    hasInit: false,
    animatedValue: null as AnimatedValue | null,
    propsToStyle: null as PropsToStyle | null,
    hadFirstTransition: false,
  });

  const cb = useCallback((value: number, duration: number) => {
    if (!animationRef.current || !ref.current.propsToStyle || !ref.current.animatedValue) {
      return;
    }

    if (!ref.current.hadFirstTransition) {
      // Force repaint.
      animationRef.current.scrollTop;
      ref.current.hadFirstTransition = true;
    }

    const style = getStyle(
      ref.current.propsToStyle,
      ref.current.animatedValue.value,
      duration,
    );
    for (const k of Object.keys(style)) {
      animationRef.current.style[k] = style[k];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animationStyle: AnimationStyle = useCallback((animatedValue, propsToStyle) => {
    if (!ref.current.hasInit) {
      ref.current.hasInit = true;
      animatedValue.on('setValue', cb);

      ref.current.animatedValue = animatedValue;
      ref.current.propsToStyle = propsToStyle;
    }
    return getStyle(propsToStyle, animatedValue.value, animatedValue.duration);
  }, [cb]);

  useEffect(
    () => () => {
      ref.current.animatedValue?.off('setValue', cb);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return [
    animationRef,
    animationStyle,
  ] as const;
}

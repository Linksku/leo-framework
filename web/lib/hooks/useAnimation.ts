import EventEmitter from 'wolfy87-eventemitter';

import styleDeclarationToCss from 'lib/styleDeclarationToCss';

const DEFAULT_DURATION = 200;

export type AnimatedValueProps = {
  defaultValue: number,
  onComplete?: (val: number) => void,
};

export type ValToStyle = Partial<{
  [k in keyof React.CSSProperties]: (x: number) => React.CSSProperties[k];
}>;

export type Style = Partial<React.CSSProperties>;

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

function getStyle(valToStyle: ValToStyle, value: number, duration: number) {
  const keys = objectKeys(valToStyle);
  const style = {} as Style;

  if (keys.length) {
    style.transitionProperty = keys.map(k => styleDeclarationToCss(k)).join(',');
    style.transitionDuration = `${duration}ms`;
    style.transitionTimingFunction = 'ease-out';
  }

  // eslint-disable-next-line unicorn/no-array-for-each
  objectEntries(valToStyle, true).forEach(
    <T extends keyof React.CSSProperties>([k, v]: [
      T,
      ((x: number) => React.CSSProperties[T]) | undefined,
    ]) => {
      // @ts-ignore union type that is too complex to represent
      style[k] = v?.(value);
    },
  );

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
    valToStyle: null as ValToStyle | null,
    hadFirstTransition: false,
  });

  const cb = useCallback((value: number, duration: number) => {
    if (!animationRef.current || !ref.current.valToStyle || !ref.current.animatedValue) {
      return;
    }

    if (!ref.current.hadFirstTransition) {
      // Force repaint.
      // eslint-disable-next-line no-unused-expressions
      animationRef.current.scrollTop;
      ref.current.hadFirstTransition = true;
    }

    const style = getStyle(
      ref.current.valToStyle,
      ref.current.animatedValue.value,
      duration,
    );
    for (const [k, v] of objectEntries(style)) {
      animationRef.current.style.setProperty(
        styleDeclarationToCss(k),
        v.toString(),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animationStyle = useCallback((
    animatedValue: AnimatedValue,
    valToStyle: ValToStyle,
  ) => {
    if (!ref.current.hasInit) {
      ref.current.hasInit = true;
      animatedValue.on('setValue', cb);

      ref.current.animatedValue = animatedValue;
      ref.current.valToStyle = valToStyle;
    }
    return getStyle(
      valToStyle,
      animatedValue.value,
      animatedValue.duration,
    ) as Partial<React.CSSProperties>;
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

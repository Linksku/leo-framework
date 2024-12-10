type Opts = {
  timeout: number,
  debounce?: boolean,
  disabled?: boolean,
};

function createThrottle(
  getState: () => {
    current: {
      lastRunTime: number,
      timer: number | null,
      lastArgs: any[],
      lastCtx: any,
      disabled: boolean,
    },
  },
) {
  return function throttle<Args extends any[]>(
    fn: (...args: Args) => void | Promise<void>,
    {
      timeout,
      debounce = false,
      disabled = false,
    }: Opts,
  ): (...args: Args) => void {
    const state = getState();
    state.current.disabled = disabled;

    function run() {
      const { current } = state;
      current.timer = null;

      if (current.disabled) {
        current.lastRunTime = performance.now();
        return;
      }

      const res = fn.apply(current.lastCtx, current.lastArgs as Args);
      if (res instanceof Promise) {
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        res
          .catch(err => ErrorLogger.warn(err, {
            ctx: 'throttle',
            fnName: fn.name,
          }))
          .then(() => {
            current.lastRunTime = performance.now();
          });
      } else {
        current.lastRunTime = performance.now();
      }
    }

    // todo: low/mid: if fn returns a promise, maybe this should return a promise too
    return function throttleReturn(this: any, ...args: any[]) {
      if (state.current.disabled) {
        return;
      }

      const { current } = state;
      current.lastArgs = args;
      current.lastCtx = this;
      if (debounce) {
        if (current.timer) {
          clearTimeout(current.timer);
        }
        if (timeout === 0) {
          run();
        } else {
          current.timer = window.setTimeout(run, timeout);
        }
      } else if (!current.timer) {
        const delay = Math.max(0, timeout - (performance.now() - current.lastRunTime));
        if (delay === 0) {
          run();
        } else {
          current.timer = window.setTimeout(run, delay);
        }
      }
    };
  };
}

export default createThrottle(() => ({
  current: {
    lastRunTime: 0,
    timer: null,
    lastArgs: [],
    lastCtx: null,
    disabled: false,
  },
}));

const _useThrottle = createThrottle(() => useRef({
  lastRunTime: 0,
  timer: null,
  lastArgs: [],
  lastCtx: null,
  disabled: false,
}));

export function useThrottle<Args extends any[]>(
  fn: (...args: Args) => void | Promise<void>,
  opts: Stable<Opts>,
  deps = [] as StableDependencyList,
): Stable<(...args: Args) => void> {
  const latestFn = useLatestCallback(fn);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(_useThrottle(
    (...args: Args) => latestFn(...args),
    opts,
  ), deps);
}

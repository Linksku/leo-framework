type Opts = {
  timeout: number,
  restartTimerAfterFinished?: boolean,
  allowSchedulingDuringDelay?: boolean,
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
      restartTimerAfterFinished = true,
      allowSchedulingDuringDelay = false,
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

      if (!restartTimerAfterFinished) {
        current.lastRunTime = performance.now();
        const res = fn.apply(current.lastCtx, current.lastArgs as Args);
        if (res instanceof Promise) {
          res.catch(err => ErrorLogger.warn(err, `throttle: ${fn.name}`));
        }
      } else {
        const res = fn.apply(current.lastCtx, current.lastArgs as Args);
        if (res instanceof Promise) {
          res
            .catch(err => ErrorLogger.warn(err, `throttle: ${fn.name}`))
            .finally(() => {
              current.lastRunTime = performance.now();
            });
        } else {
          current.lastRunTime = performance.now();
        }
      }
    }

    // todo low/mid: if fn returns a promise, maybe this should return a promise too
    return function throttleReturn(this: any, ...args: any[]) {
      const { current } = state;
      current.lastArgs = args;
      current.lastCtx = this;
      if (!current.timer) {
        if (allowSchedulingDuringDelay) {
          current.timer = window.setTimeout(
            run,
            Math.max(0, timeout - (performance.now() - current.lastRunTime)),
          );
        } else if (performance.now() - current.lastRunTime >= timeout) {
          current.timer = window.setTimeout(run, timeout);
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

// todo: high/mid use latest callback fn
export function useThrottle<Args extends any[]>(
  fn: (...args: Args) => void | Promise<void>,
  opts: Memoed<Opts>,
  deps = [] as MemoDependencyList,
): Memoed<(...args: Args) => void> {
  useEffect(() => () => {
    opts.disabled = true;
  }, [opts]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(_useThrottle(fn, opts), deps);
}

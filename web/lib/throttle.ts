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
  return function throttle<T = Window>(
    fn: (...args: any[]) => void | Promise<void>,
    {
      timeout,
      restartTimerAfterFinished = true,
      allowSchedulingDuringDelay = false,
      disabled = false,
    }: Opts,
  ) {
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
        const res = fn.apply(current.lastCtx, current.lastArgs);
        if (res instanceof Promise) {
          res.catch(err => ErrorLogger.warning(err, `throttle: ${fn.name}`));
        }
      } else {
        const res = fn.apply(current.lastCtx, current.lastArgs);
        if (res instanceof Promise) {
          res
            .catch(err => ErrorLogger.warning(err, `throttle: ${fn.name}`))
            .finally(() => {
              current.lastRunTime = performance.now();
            });
        } else {
          current.lastRunTime = performance.now();
        }
      }
    }

    // todo low/mid: if fn returns a promise, maybe this should return a promise too
    return function throttleReturn(this: T, ...args: any[]) {
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

export function useThrottle<T = Window>(
  fn: (...args: any[]) => void,
  opts: Memoed<Opts>,
  deps = [] as MemoDependencyList,
) {
  useEffect(() => () => {
    opts.disabled = true;
  }, [opts]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(_useThrottle<T>(fn, opts), deps);
}

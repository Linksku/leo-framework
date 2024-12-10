const DEFAULT_STATE = Symbol('DEFAULT_STATE');

// Basically useState that updates automatically when deps change
export default function useMemoWithState<T>(
  cb: () => T,
  deps: StableDependencyList,
): [
  Stable<T>,
  SetState<T>,
] {
  const [state, setState] = useState<T | symbol>(DEFAULT_STATE);
  const prevState = useRef(state);
  const memoed = useMemo(
    () => {
      if (state !== prevState.current && state !== DEFAULT_STATE) {
        return state as T;
      }

      return cb();
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [...deps, state],
  );

  useEffect(() => {
    prevState.current = state;
  }, [state]);

  return [
    memoed,
    setState as SetState<T>,
  ];
}

import shallowEqual from 'utils/shallowEqual';

export default function usePreviousDifferent<T>(
  state: T,
  useShallowEqual?: boolean,
): T | undefined {
  const ref = useRef({
    prev: undefined as T | undefined,
    cur: state as T | undefined,
  });

  const isDifferent = (useShallowEqual && !shallowEqual(ref.current.cur, state))
    || (!useShallowEqual && ref.current.cur !== state);

  useEffect(() => {
    if (isDifferent) {
      ref.current.prev = ref.current.cur;
      ref.current.cur = state;
    }
  });

  return isDifferent ? ref.current.cur : ref.current.prev;
}

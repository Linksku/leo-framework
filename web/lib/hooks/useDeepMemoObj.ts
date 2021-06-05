import equal from 'fast-deep-equal';

export default function useDeepMemoObj<T extends ObjectOf<any>>(
  obj: T,
): Memoed<T> {
  const ref = useRef({
    prevObj: obj,
    changeCount: 0,
  });
  if (!equal(obj, ref.current.prevObj)) {
    ref.current.changeCount++;
  }
  ref.current.prevObj = obj;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => obj, [ref.current.changeCount]);
}

export default function useShallowMemoObject(
  obj: ObjectOf<any>,
) {
  const ref = useRef({
    prevObj: obj,
    changeCount: 0,
  });

  const curKeys = Object.keys(obj);
  const prevKeys = Object.keys(ref.current.prevObj);
  if (curKeys.length !== prevKeys.length) {
    ref.current.changeCount++;
  } else {
    for (const k of curKeys) {
      if (obj[k] !== ref.current.prevObj[k]) {
        ref.current.changeCount++;
        break;
      }
    }
  }
  ref.current.prevObj = obj;

  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => obj, [ref.current.changeCount]);
}

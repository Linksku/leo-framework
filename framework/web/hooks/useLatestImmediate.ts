// If ref is used only in callbacks/effects, use useLatest.
export default function useLatestImmediate<T>(val: T): React.MutableRefObject<T> {
  const ref = useRef({
    tempVal: val,
    committedVal: val,
    updateCount: 0,
  });
  ref.current.tempVal = val;
  const startingUpdateCount = ref.current.updateCount;

  useLayoutEffect(() => {
    ref.current.committedVal = ref.current.tempVal;
    ref.current.updateCount++;
  });

  // todo: low/hard make this return the same object every time
  return {
    get current() {
      // tempVal is from new render, committedVal is from old render.
      return ref.current.updateCount === startingUpdateCount
        ? ref.current.tempVal
        : ref.current.committedVal;
    },
    set current(newVal: T) {
      ref.current.tempVal = newVal;
    },
  };
}

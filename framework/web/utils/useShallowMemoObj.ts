import shallowEqual from 'utils/shallowEqual';
import useAccumulatedVal from 'utils/useAccumulatedVal';

export default process.env.PRODUCTION
  ? function useShallowMemoObj<T>(obj: T) {
    return useAccumulatedVal(
      obj,
      s => (shallowEqual(s, obj) ? s : obj),
    ) as StableDeep<T>;
  }
  : function useShallowMemoObj<T>(obj: T) {
    const ref = useRef({
      numRenders: 0,
      numUpdates: 0,
      prevObj: obj,
    });

    useEffect(() => {
      ref.current.numRenders++;
      if (!shallowEqual(obj, ref.current.prevObj)) {
        ref.current.numUpdates++;

        if (ref.current.numUpdates > 3 && ref.current.numUpdates === ref.current.numRenders) {
          // eslint-disable-next-line no-console
          console.warn('useDeepMemoObj: updated for every render', obj);
        }
      }

      ref.current.prevObj = obj;
    });

    return useAccumulatedVal(
      obj,
      s => (shallowEqual(s, obj) ? s : obj),
    ) as StableDeep<T>;
  };

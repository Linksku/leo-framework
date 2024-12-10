import equal from 'fast-deep-equal';

import useAccumulatedVal from 'utils/useAccumulatedVal';

export default process.env.PRODUCTION
  ? function useDeepMemoObj<T>(obj: T) {
    return useAccumulatedVal(
      obj,
      s => (equal(s, obj) ? s : obj),
    ) as StableDeep<T>;
  }
  : function useDeepMemoObj<T>(obj: T) {
    const ref = useRef({
      numRenders: 0,
      numUpdates: 0,
      prevObj: obj,
    });

    useEffect(() => {
      ref.current.numRenders++;
      if (!equal(obj, ref.current.prevObj)) {
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
      s => (equal(s, obj) ? s : obj),
    ) as StableDeep<T>;
  };

import shallowEqual from 'utils/shallowEqual';
import useUpdatedState from 'hooks/useUpdatedState';

export default process.env.PRODUCTION
  ? function useDeepMemoObj<T>(obj: T) {
    return useUpdatedState(
      obj,
      s => (shallowEqual(s, obj) ? s : obj),
    ) as MemoDeep<T>;
  }
  : function useDeepMemoObj<T>(obj: T) {
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

    return useUpdatedState(
      obj,
      s => (shallowEqual(s, obj) ? s : obj),
    ) as MemoDeep<T>;
  };

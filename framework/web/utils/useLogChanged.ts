/* eslint-disable no-console */
import usePrevious from 'utils/usePrevious';

export default function useLogChanged<T>(val: T) {
  const prev = usePrevious(val);
  const firstVal = useRef(val);

  useEffect(() => {
    if (val === prev || (prev === undefined && val === firstVal.current)) {
      return;
    }

    if (Array.isArray(val) && Array.isArray(prev) && val.length === prev.length) {
      console.group();
      for (const [i, v] of val.entries()) {
        if (v !== prev[i]) {
          console.log(`%cIndex ${i} changed:`, 'color: #f00');
          console.log(prev[i], v);
          break;
        }
      }
      console.groupEnd();
    } else if (typeof val === 'object' && typeof prev === 'object' && val && prev) {
      console.group();
      for (const [k, v] of TS.objEntries(val)) {
        if (v !== prev[k]) {
          console.log(`%cKey ${k} changed:`, 'color: #f00');
          console.log(prev[k], v);
          break;
        }
      }
      console.groupEnd();
    } else {
      console.log('%cVal changed:', 'color: #f00');
      console.log(val);
    }
  });
}

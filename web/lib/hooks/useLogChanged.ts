/* eslint-disable no-console */
import usePrevious from 'react-use/lib/usePrevious';

export default function useLogChanged<T>(val: T) {
  const prev = usePrevious(val);

  useEffect(() => {
    console.group();
    if (val !== prev) {
      console.log('%cVal changed:', 'color: #f00');
      console.log(val);
    }
    if (Array.isArray(val) && Array.isArray(prev) && val.length === prev.length) {
      for (const [i, v] of val.entries()) {
        if (v !== prev[i]) {
          console.log(`%cIndex ${i} changed:`, 'color: #f00');
          console.log(prev[i], v);
          break;
        }
      }
    } else if (typeof val === 'object' && typeof prev === 'object' && val && prev) {
      for (const k of Object.keys(val)) {
        if (val[k] !== prev[k]) {
          console.log(`%cKey ${k} changed:`, 'color: #f00');
          console.log(prev[k], val[k]);
          break;
        }
      }
    }
    console.groupEnd();
  });
}

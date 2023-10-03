import equal from 'fast-deep-equal/es6/react';
import isDebug from 'utils/isDebug';

export default function useConst<T>(
  defaultVal: T | (() => T),
): Stable<T> {
  const [val] = useState(defaultVal);
  if (!process.env.PRODUCTION
    && !isDebug
    && typeof defaultVal !== 'function'
    && !equal(val, defaultVal)) {
    // eslint-disable-next-line no-console
    console.error('useConst: val changed.', defaultVal, val);
  }
  return val;
}

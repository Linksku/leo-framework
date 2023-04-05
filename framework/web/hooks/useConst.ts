import equal from 'fast-deep-equal/es6/react';

export default function useConst<T>(
  defaultVal: T | (() => T),
): Memoed<T> {
  const [val] = useState(defaultVal);
  if (!process.env.PRODUCTION
    && typeof defaultVal !== 'function'
    && !equal(val, defaultVal)) {
    // eslint-disable-next-line no-console
    console.error('useConst: val changed.', defaultVal, val);
  }
  return val;
}

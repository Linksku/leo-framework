import equal from 'fast-deep-equal';

export default function useConst<T>(
  defaultVal: T | (() => T),
): Memoed<T> {
  const [val] = useState(defaultVal);
  if (process.env.NODE_ENV !== 'production'
    && typeof defaultVal !== 'function'
    && !equal(val, defaultVal)) {
    // eslint-disable-next-line no-console
    console.error('useConst: val changed.', defaultVal, val);
  }
  return val;
}

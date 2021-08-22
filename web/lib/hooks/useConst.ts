import equal from 'fast-deep-equal';

export default function useConst<T>(
  defaultVal: T | (() => T),
): Memoed<T> {
  const [val] = useState(defaultVal);
  if (process.env.NODE_ENV !== 'production'
    && typeof defaultVal !== 'function'
    && !equal(val, defaultVal)) {
    console.error('useConst: val changed.', defaultVal, val);
  }
  return val;
}

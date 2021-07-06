import createMemoCache from 'lib/createMemoCache';

export default function useMemoCache() {
  const ref = useRef(createMemoCache());
  return markMemoed(ref.current);
}

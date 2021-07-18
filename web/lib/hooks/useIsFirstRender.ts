export default function useIsFirstRender() {
  const ref = useRef(true);
  const ret = ref.current;
  ref.current = false;
  return ret;
}

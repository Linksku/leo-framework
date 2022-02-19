export default function mergeRefs<T = any>(
  ...refs: Array<Nullish<React.Ref<T>>>
) {
  return (value: T) => {
    for (const ref of refs) {
      if (typeof ref === 'function') {
        ref(value);
      } else if (ref) {
        (ref as React.MutableRefObject<T>).current = value;
      }
    }
  };
}

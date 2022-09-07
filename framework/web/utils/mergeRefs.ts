export default function mergeRefs<T extends HTMLElement | undefined>(
  ...refs: Array<Nullish<React.Ref<T>>>
): React.RefCallback<T> {
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

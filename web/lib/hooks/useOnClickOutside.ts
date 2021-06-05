export default function useOnClickOutside(
  ref: React.MutableRefObject<HTMLElement | null>,
  handler: Memoed<(event: MouseEvent | TouchEvent) => void>,
) {
  useEffect(
    () => {
      const listener = (event: MouseEvent | TouchEvent) => {
        if (!ref.current || ref.current.contains(event.target as Node)) {
          return;
        }

        handler(event);
      };

      document.addEventListener('mousedown', listener);
      document.addEventListener('touchstart', listener);

      return () => {
        document.removeEventListener('mousedown', listener);
        document.removeEventListener('touchstart', listener);
      };
    },
    [ref, handler],
  );
}

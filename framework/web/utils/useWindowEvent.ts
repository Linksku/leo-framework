export default function useWindowEvent<T extends keyof WindowEventMap>(
  eventType: T,
  cb: Stable<(event: WindowEventMap[T]) => any>,
  opts?: boolean | Stable<AddEventListenerOptions>,
): void {
  useEffect(() => {
    window.addEventListener(eventType, cb, opts);

    return () => {
      window.removeEventListener(eventType, cb);
    };
  }, [eventType, cb, opts]);
}

export default function useWindowEvent<T extends keyof WindowEventMap>(
  eventType: T,
  cb: Memoed<(event: WindowEventMap[T]) => any>,
  opts?: boolean | Memoed<AddEventListenerOptions>,
) {
  useEffect(() => {
    window.addEventListener(eventType, cb, opts);

    return () => {
      window.removeEventListener(eventType, cb);
    };
  }, [eventType, cb, opts]);
}

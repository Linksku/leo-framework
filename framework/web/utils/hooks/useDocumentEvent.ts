export default function useDocumentEvent<T extends keyof DocumentEventMap>(
  eventType: T,
  cb: Memoed<(event: DocumentEventMap[T]) => any>,
  opts?: boolean | Memoed<AddEventListenerOptions>,
) {
  useEffect(() => {
    document.addEventListener(eventType, cb, opts);

    return () => {
      document.removeEventListener(eventType, cb);
    };
  }, [eventType, cb, opts]);
}

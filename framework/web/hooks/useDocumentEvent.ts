export default function useDocumentEvent<T extends keyof DocumentEventMap>(
  eventType: T,
  cb: Stable<(event: DocumentEventMap[T]) => any>,
  opts?: boolean | Stable<AddEventListenerOptions>,
) {
  useEffect(() => {
    document.addEventListener(eventType, cb, opts);

    return () => {
      document.removeEventListener(eventType, cb);
    };
  }, [eventType, cb, opts]);
}

import useEnterRoute from 'hooks/useEnterRoute';

export default function useAutoFocusOnEnterRoute(autoFocus: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  const didFocus = useRef(false);

  useEnterRoute(useCallback(() => {
    if (!autoFocus) {
      return NOOP;
    }

    if (ref.current && !didFocus.current) {
      ref.current.focus({
        // Note: auto scroll can scroll elements with overflow: hidden
        preventScroll: true,
      });
      didFocus.current = true;
    }

    return () => {
      const elem = ref.current;
      if (elem && document.activeElement === elem) {
        elem.blur();

        if (navigator.virtualKeyboard) {
          navigator.virtualKeyboard.hide();
        }
        // Note: not sure if blur() is enough to hide keyboard https://stackoverflow.com/a/11160055
      }
    };
  }, [autoFocus]));

  return ref;
}

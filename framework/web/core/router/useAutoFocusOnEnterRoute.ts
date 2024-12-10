import useEnterRoute from 'core/router/useEnterRoute';
import hideVirtualKeyboard from 'utils/hideVirtualKeyboard';

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
        hideVirtualKeyboard();
      }
    };
  }, [autoFocus]));

  return ref;
}

import { addPopHandler, removePopHandler } from 'stores/history/HistoryStore';
import { useAnimatedValue } from 'core/useAnimation';
import { API_POST_TIMEOUT } from 'consts/server';

export const [
  SlideUpProvider,
  useSlideUpStore,
  useShowSlideUp,
  useHideSlideUp,
] = constate(
  function SlideUpStore() {
    const [state, setState] = useStateStable({
      shown: false,
      element: null as Stable<ReactElement> | null,
      numShown: 0,
    });
    const ref = useRef({
      shown: state.shown,
      hideTimer: null as number | null,
    });
    const animatedShownPercent = useAnimatedValue(
      0,
      { debugName: 'SlideUps' },
    );

    const hideSlideUpRaw = useCallback((instant?: boolean) => {
      if (ref.current.hideTimer) {
        clearTimeout(ref.current.hideTimer);
        ref.current.hideTimer = null;
      }

      if (instant) {
        setState({ shown: false, element: null });
      } else {
        setState({ shown: false });
        ref.current.hideTimer = window.setTimeout(() => {
          setState({ element: null });
          // Wait for APIs to complete
        }, API_POST_TIMEOUT);
      }

      animatedShownPercent.setVal(0, instant ? 0 : undefined);
    }, [setState, animatedShownPercent]);

    const handlePopHistory = useCallback(() => {
      if (ref.current.shown) {
        hideSlideUpRaw();
        return true;
      }
      return false;
    }, [hideSlideUpRaw]);

    const hideSlideUp = useCallback((instant?: boolean) => {
      hideSlideUpRaw(instant);
      removePopHandler(handlePopHistory);
    }, [hideSlideUpRaw, handlePopHistory]);

    const showSlideUp = useCallback((element: ReactElement) => {
      if (ref.current.hideTimer) {
        clearTimeout(ref.current.hideTimer);
        ref.current.hideTimer = null;
      }

      setState(s => ({
        shown: true,
        element: markStable(React.cloneElement(
          element,
          { key: s.numShown },
        )),
        numShown: s.numShown + 1,
      }));

      addPopHandler(handlePopHistory);
    }, [setState, handlePopHistory]);

    useEffect(() => {
      ref.current.shown = state.shown;
    }, [state.shown]);

    return useMemo(() => ({
      showSlideUp,
      hideSlideUp,
      slideUpShown: state.shown,
      slideUpElement: state.element,
      animatedShownPercent,
    }), [
      showSlideUp,
      hideSlideUp,
      state.shown,
      state.element,
      animatedShownPercent,
    ]);
  },
  function SlideUpStore(val) {
    return val;
  },
  function ShowSlideUp(val) {
    return val.showSlideUp;
  },
  function HideSlideUp(val) {
    return val.hideSlideUp;
  },
);

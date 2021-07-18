const [
  SlideUpProvider,
  useSlideUpStore,
  useShowSlideUp,
  useHideSlideUp,
] = constate(
  function SlideUpStore() {
    const [state, setState] = useState({
      shown: false,
      element: null as React.ReactElement | null,
    });
    const ref = useRef({
      shown: state.shown,
    });
    ref.current.shown = state.shown;
    const { addPopHandler } = useHistoryStore();

    const hideSlideUp = useCallback((instant = false) => {
      if (instant) {
        setState(s => ({ ...s, shown: false, element: null }));
      } else {
        setState(s => ({ ...s, shown: false }));
      }
    }, [setState]);

    const showSlideUp = useCallback((element: React.ReactElement) => {
      setState({ shown: true, element });

      addPopHandler(() => {
        if (ref.current.shown) {
          hideSlideUp();
          return true;
        }
        return false;
      });
    }, [setState, addPopHandler, hideSlideUp]);

    return useDeepMemoObj({
      showSlideUp,
      hideSlideUp,
      slideUpShown: state.shown,
      slideUpElement: state.element,
    });
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

export { SlideUpProvider, useSlideUpStore, useShowSlideUp, useHideSlideUp };

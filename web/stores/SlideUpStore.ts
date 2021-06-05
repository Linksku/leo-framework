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

    const showSlideUp = useCallback((element: React.ReactElement) => {
      setState({ shown: true, element });
    }, [setState]);

    const hideSlideUp = useCallback((instant = false) => {
      if (instant) {
        setState(s => ({ ...s, shown: false, element: null }));
      } else {
        setState(s => ({ ...s, shown: false }));
      }
    }, [setState]);

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

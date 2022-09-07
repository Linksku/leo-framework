import { useAddPopHandler } from './HistoryStore';

export const [
  SlideUpProvider,
  useSlideUpStore,
  useShowSlideUp,
  useHideSlideUp,
] = constate(
  function SlideUpStore() {
    const [state, setState] = useStateStable({
      shown: false,
      element: null as Memoed<ReactElement> | null,
    });
    const shownRef = useRef(state.shown);
    const addPopHandler = useAddPopHandler();

    const hideSlideUp = useCallback((instant?: boolean) => {
      if (instant) {
        setState({ shown: false, element: null });
      } else {
        setState({ shown: false });
      }
    }, [setState]);

    const showSlideUp = useCallback((element: ReactElement) => {
      setState({ shown: true, element: markMemoed(element) });

      addPopHandler(() => {
        if (shownRef.current) {
          hideSlideUp();
          return true;
        }
        return false;
      });
    }, [setState, addPopHandler, hideSlideUp]);

    useEffect(() => {
      shownRef.current = state.shown;
    }, [state.shown]);

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

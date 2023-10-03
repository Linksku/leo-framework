import { useAnimatedValue } from 'hooks/useAnimation';
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
      element: null as Stable<ReactElement> | null,
      numShown: 0,
    });
    const shownRef = useRef(state.shown);
    const animatedShownPercent = useAnimatedValue(
      0,
      { debugName: 'SlideUps' },
    );
    const addPopHandler = useAddPopHandler();

    const hideSlideUp = useCallback((instant?: boolean) => {
      if (instant) {
        setState({ shown: false, element: null });
      } else {
        setState({ shown: false });
      }

      animatedShownPercent.setVal(0, instant ? 0 : undefined);
    }, [setState, animatedShownPercent]);

    const showSlideUp = useCallback((element: ReactElement) => {
      setState(s => ({
        shown: true,
        element: markStable(React.cloneElement(
          element,
          { key: s.numShown },
        )),
        numShown: s.numShown + 1,
      }));

      animatedShownPercent.setVal(100);

      addPopHandler(() => {
        if (shownRef.current) {
          hideSlideUp();
          return true;
        }
        return false;
      });
    }, [setState, animatedShownPercent, addPopHandler, hideSlideUp]);

    useEffect(() => {
      shownRef.current = state.shown;
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

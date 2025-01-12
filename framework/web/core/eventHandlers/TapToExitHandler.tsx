import { addPopHandler } from 'stores/history/HistoryStore';

export default function TapToExitHandler() {
  const { curState, prevState } = useNavState();

  const hasAttemptedExitRef = useRef(false);
  const hasVisitedNonHomeRef = useRef(false);

  useEffect(() => {
    if (curState.path !== '/') {
      hasVisitedNonHomeRef.current = true;
    }

    if (hasVisitedNonHomeRef.current && !prevState && curState.path === '/') {
      hasAttemptedExitRef.current = false;

      const removePopHandler = addPopHandler(() => {
        if (!hasAttemptedExitRef.current) {
          showToast({
            msg: 'Tap again to exit',
          });
          hasAttemptedExitRef.current = true;
          return true;
        }
        return false;
      });

      return () => {
        removePopHandler();
      };
    }

    return undefined;
  }, [curState, prevState]);

  return null;
}

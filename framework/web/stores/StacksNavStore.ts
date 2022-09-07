import { useHomeNavStore } from './HomeNavStore';

export const [
  StacksNavProvider,
  useStacksNavStore,
] = constate(
  function StacksNavStore() {
    let stackBot: HistoryState | null = null;
    let stackTop: HistoryState | null = null;
    let stackActive: HistoryState | null = null;

    const {
      prevState,
      curState,
      direction,
      didRefresh,
    } = useHistoryStore();
    const { isHome, wasHome } = useHomeNavStore();
    const pushPath = usePushPath();

    if (didRefresh) {
      stackBot = curState;
    } else if (isHome) {
      stackBot = curState;
      if (!wasHome) {
        // Stack -> home.
        stackTop = prevState;
      }
    } else if (wasHome) {
      // Home -> stack.
      stackBot = prevState;
      stackTop = curState;
      stackActive = stackTop;
    } else if (direction === 'forward') {
      stackBot = prevState;
      stackTop = curState;
      stackActive = stackTop;
    } else if (direction === 'back') {
      stackBot = curState;
      stackTop = prevState;
    } else {
      // Page load
      stackBot = curState;
    }

    const goBackStack = useCallback(() => {
      if (!prevState) {
        pushPath('/');
      } else if (!isHome) {
        // todo: low/mid prevent exiting app by going back
        window.history.back();
      }
    }, [prevState, pushPath, isHome]);

    const goForwardStack = useCallback(() => {
      if (!isHome) {
        window.history.forward();
      }
    }, [isHome]);

    return useDeepMemoObj({
      stackBot,
      stackTop,
      stackActive: stackActive ?? stackBot,
      goBackStack,
      goForwardStack,
    });
  },
);

import { useHomeNavStore } from './HomeNavStore';

const [
  StacksNavProvider,
  useStacksNavStore,
] = constate(
  function StacksNavStore() {
    let stackBot: HistoryState | null = null;
    let stackTop: HistoryState | null = null;
    let stackActive = 'bot';

    const {
      prevState,
      curState,
      direction,
    } = useHistoryStore();
    const { isHome, wasHome } = useHomeNavStore();

    if (isHome) {
      stackBot = curState;
      if (!wasHome) {
        // Stack -> home.
        stackTop = prevState;
      }
    } else if (wasHome) {
      // Home -> stack.
      stackBot = prevState;
      stackTop = curState;
      stackActive = 'top';
    } else if (direction === 'forward') {
      stackBot = prevState;
      stackTop = curState;
      stackActive = 'top';
    } else if (direction === 'back') {
      stackBot = curState;
      stackTop = prevState;
    } else {
      // Page load
      stackBot = curState;
    }

    const backStack = useCallback(() => {
      if (!isHome) {
        window.history.back();
      }
    }, [isHome]);

    const forwardStack = useCallback(() => {
      if (!wasHome) {
        window.history.forward();
      }
    }, [wasHome]);

    return useDeepMemoObj({
      stackBot,
      stackTop,
      stackActive,
      backStack,
      forwardStack,
    });
  },
);

export {
  StacksNavProvider,
  useStacksNavStore,
};

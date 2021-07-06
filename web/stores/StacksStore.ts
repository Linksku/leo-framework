import { HOME_TABS } from 'config/homeTabs';

const [
  StacksProvider,
  useStacksStore,
] = constate(
  function StacksStore() {
    const ref = useRef<{
      isHome: boolean,
      wasHome: boolean,
    }>({
      isHome: false,
      wasHome: false,
    });
    let stackBot: HistoryState | null = null;
    let stackTop: HistoryState | null = null;
    let stackActive = 'bot';

    const {
      prevState,
      curState,
      direction,
    } = useHistoryStore();
    const pathParts = curState.path.slice(1).split('/');
    const prevPathParts = prevState ? prevState.path.slice(1).split('/') : null;
    ref.current.isHome = pathParts[0] === ''
      || hasOwnProperty(HOME_TABS, pathParts[0].toUpperCase());
    ref.current.wasHome = !!prevPathParts && (prevPathParts[0] === ''
      || hasOwnProperty(HOME_TABS, prevPathParts[0].toUpperCase()));

    if (ref.current.isHome) {
      stackBot = curState;
      if (!ref.current.wasHome) {
        // Stack -> home.
        stackTop = prevState;
      }
    } else if (ref.current.wasHome) {
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
      if (!ref.current.isHome) {
        window.history.back();
      }
    }, []);

    const forwardStack = useCallback(() => {
      if (!ref.current.wasHome) {
        window.history.forward();
      }
    }, []);

    stackBot = markMemoed(stackBot);
    stackTop = markMemoed(stackTop);
    return useDeepMemoObj({
      stackBot,
      stackTop,
      stackActive,
      backStack,
      forwardStack,
      isHome: ref.current.isHome,
    });
  },
);

export {
  StacksProvider,
  useStacksStore,
};

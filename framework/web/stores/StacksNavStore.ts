import type { AnimatedValue } from 'hooks/useAnimation';
import { useHomeNavStore } from './HomeNavStore';

// todo: mid/hard when going back twice by swiping, the bottom stack isn't shown
export const [
  StacksNavProvider,
  useStacksNavStore,
  useGoBackStack,
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
    const replacePath = useReplacePath();
    const lastStackAnimatedVal = useRef<AnimatedValue | null>(null);

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

    const hasPrevState = !!prevState;
    const goBackStack = useCallback(() => {
      if (!hasPrevState) {
        replacePath('/', null);
        pushPath(curState.path, curState.query, curState.hash);
      }

      if (!isHome) {
        window.history.back();
      }
    }, [hasPrevState, pushPath, replacePath, isHome, curState]);

    const goForwardStack = useCallback(() => {
      if (!isHome && (direction === 'forward' || !wasHome)) {
        window.history.forward();
      }
    }, [isHome, direction, wasHome]);

    return useMemo(() => ({
      stackBot,
      stackTop,
      stackActive: stackActive ?? stackBot,
      goBackStack,
      goForwardStack,
      lastStackAnimatedVal,
    }), [
      stackBot,
      stackTop,
      stackActive,
      goBackStack,
      goForwardStack,
      lastStackAnimatedVal,
    ]);
  },
  function StacksNavStore(val) {
    return val;
  },
  function GoBackStack(val) {
    return val.goBackStack;
  },
);

import type { AnimatedValue } from 'hooks/useAnimation';
import { useHomeNavStore } from './HomeNavStore';

// todo: mid/hard when going back twice by swiping, the bottom stack isn't shown
export const [
  StacksNavProvider,
  useStacksNavStore,
  useGoBackStack,
] = constate(
  function StacksNavStore() {
    const {
      curState,
      forwardState,
      backState,
      prevState,
      addHomeToHistory,
    } = useHistoryStore();
    const {
      isHome,
      isForwardHome,
      isPrevHome,
    } = useHomeNavStore();
    const stackToAnimatedVal = useRef<WeakMap<HistoryState, AnimatedValue>>(new WeakMap());

    const curStack = curState;
    let backStack: HistoryState | null = null;
    let forwardStack: HistoryState | null = null;
    if (isHome) {
      if (prevState && !isPrevHome) {
        forwardStack = prevState;
      } else if (forwardState && !isForwardHome) {
        // Home -> home -> stack
        forwardStack = forwardState;
      }
    } else {
      backStack = backState;

      if (!isForwardHome) {
        forwardStack = forwardState;
      }
    }

    const hasBackState = !!backState;
    const goBackStack = useLatest(() => {
      if (!hasBackState) {
        addHomeToHistory();
      }

      if (!isHome) {
        window.history.back();
      }
    });

    const hasForwardStack = !!forwardStack;
    const shouldForwardStackGoForward = !isForwardHome;
    const goForwardStack = useLatest(() => {
      if (hasForwardStack) {
        if (shouldForwardStackGoForward) {
          window.history.forward();
        } else {
          window.history.back();
        }
      }
    });

    return useMemo(() => ({
      curStack,
      backStack,
      forwardStack,
      goBackStack,
      goForwardStack,
      stackToAnimatedVal,
    }), [
      curStack,
      backStack,
      forwardStack,
      goBackStack,
      goForwardStack,
      stackToAnimatedVal,
    ]);
  },
  function StacksNavStore(val) {
    return val;
  },
  function GoBackStack(val) {
    return val.goBackStack;
  },
);

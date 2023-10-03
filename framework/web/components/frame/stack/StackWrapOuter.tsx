import { useAnimatedValue, useAnimation } from 'hooks/useAnimation';
import Swipeable from 'components/frame/Swipeable';
import ErrorBoundary from 'components/ErrorBoundary';
import ErrorPage from 'components/ErrorPage';
import { CONTAINER_MAX_WIDTH, IOS_EDGE_SWIPE_PX } from 'consts/ui';

import styles from './StackWrapOuterStyles.scss';

// todo: mid/mid swipe to go forward stack
export default function StackWrapOuter({
  children,
}: React.PropsWithChildren) {
  const {
    path,
    forwardState,
    isRouteActive,
    isCurStack,
    isForwardStack,
    routeOpts,
    historyState,
  } = useRouteStore();
  const {
    isReplaced,
    prevState,
  } = useHistoryStore();
  const { isPrevHome } = useHomeNavStore();
  const {
    backStack,
    forwardStack,
    goBackStack,
    stackToAnimatedVal,
    goForwardStack,
  } = useStacksNavStore();
  const slideIn = isCurStack && !isReplaced && !!prevState
    && (prevState === backStack || isPrevHome);
  const slideOut = isForwardStack && !isReplaced
    && prevState === forwardStack;
  const windowSize = useWindowSize();

  // 0 = shown, 100 = hidden
  const animatedLeftPercent = useAnimatedValue(
    slideIn || isForwardStack
      ? 100
      : 0,
    { debugName: `StackWrapOuter(${path})` },
  );
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>(
    animatedLeftPercent,
    `StackWrapOuter(${path})`,
  );

  useLayoutEffect(() => {
    if (slideIn) {
      animatedLeftPercent.setVal(0);
    } else if (slideOut) {
      animatedLeftPercent.setVal(100);
    }
  }, [slideIn, slideOut, animatedLeftPercent]);

  useEffect(() => {
    stackToAnimatedVal.current.set(historyState, animatedLeftPercent);
  }, [stackToAnimatedVal, historyState, animatedLeftPercent]);

  const enableSwipeFromLeft = isRouteActive && !routeOpts.disableBackSwipe;
  const enableSwipeFromRight = (isRouteActive || isForwardStack) && !!forwardState;
  let maxSwipeStartDist = Math.max(IOS_EDGE_SWIPE_PX, windowSize.width / 10);
  if (windowSize.width > CONTAINER_MAX_WIDTH) {
    maxSwipeStartDist += (windowSize.width - CONTAINER_MAX_WIDTH) / 2;
  }
  return (
    <Swipeable
      ref={animationRef}
      swipeProps={{
        disabled: !enableSwipeFromLeft && !enableSwipeFromRight,
        direction: enableSwipeFromLeft && enableSwipeFromRight
          ? 'horizontal'
          : (enableSwipeFromLeft ? 'right' : 'left'),
        elementDim: windowSize.width,
        maxSwipeStartDist: [
          undefined,
          maxSwipeStartDist,
        ],
        setPercent(p, duration, dir) {
          if (dir === 'right') {
            animatedLeftPercent.setVal(
              p,
              duration,
              'easeOutQuad',
            );
          } else if (forwardState) {
            stackToAnimatedVal.current.get(forwardState)
              ?.setVal(
                100 - p,
                duration,
                'easeOutQuad',
              );
          }
        },
        onNavigate(dir) {
          if (dir === 'right') {
            goBackStack.current();
          } else {
            goForwardStack.current();
          }
        },
      }}
      style={animationStyle(
        {
          transform: x => `translateZ(0) translateX(${x}%)`,
          boxShadow: x => `-${(100 - x) / 20}px 0 ${(100 - x) / 10}px -${(100 - x) / 20}px rgb(0 0 0 / ${((100 - x) / 10) + 10}%)`,
        },
        {
          stylesForFinalVal: {
            0: {
              position: 'absolute',
              top: 0,
            },
          },
          skipTransitionProps: ['position', 'top'],
        },
      )}
      className={styles.container}
    >
      <ErrorBoundary
        renderError={msg => (
          <ErrorPage
            title="Error"
            content={msg}
          />
        )}
      >
        {children}
      </ErrorBoundary>
    </Swipeable>
  );
}

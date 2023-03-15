import { Freeze } from 'react-freeze';

import { useAnimatedValue, useAnimation, DEFAULT_DURATION } from 'utils/hooks/useAnimation';
import Swipeable from 'components/frame/Swipeable';
import ErrorBoundary from 'components/ErrorBoundary';

import styles from './StackWrapOuterStyles.scss';

// todo: mid/mid swipe to go forward stack
export default function StackWrapOuter({
  children,
}: React.PropsWithChildren) {
  const {
    path,
    isRouteActive,
    isRouteVisible,
    isStackTop,
    routeOpts,
  } = useRouteStore();
  const { isReplaced } = useHistoryStore();
  const { goBackStack, lastStackAnimatedVal } = useStacksNavStore();
  const showSlide = isStackTop && (!isReplaced || path === '/register');
  const slideIn = showSlide && isRouteActive;
  const slideOut = showSlide && !isRouteActive;
  const animatedLeftPercent = useAnimatedValue(
    slideIn ? 100 : 0,
    `StackWrapOuter(${path})`,
  );
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();

  useEffect(() => {
    if (slideIn) {
      animatedLeftPercent.setVal(0);
    } else if (slideOut) {
      animatedLeftPercent.setVal(100);
    }

    if (isRouteActive) {
      lastStackAnimatedVal.current = animatedLeftPercent;
    }
  }, [slideIn, slideOut, animatedLeftPercent, isRouteActive, lastStackAnimatedVal]);

  return (
    <Freeze freeze={!isRouteVisible}>
      <Swipeable
        ref={animationRef}
        swipeProps={{
          onNavigate: goBackStack,
          setPercent: (p, durationPercent) => animatedLeftPercent.setVal(
            p,
            durationPercent * DEFAULT_DURATION,
          ),
          direction: 'right',
          enabled: isRouteActive && !routeOpts.disableBackSwipe,
        }}
        style={animationStyle(
          animatedLeftPercent,
          {
            // "fixed" is needed to prevent .focus() in the stack from scrolling the parent
            // https://stackoverflow.com/q/75419337
            position: x => (x > 0 ? 'fixed' : 'absolute'),
            transform: x => `translateZ(0) translateX(${x}%)`,
            boxShadow: x => `0 0 ${(100 - x) / 5}px rgb(0 0 0 / ${(100 - x) / 5}%)`,
          },
          { keyframes: [1] },
        )}
        className={styles.container}
      >
        <ErrorBoundary>
          <React.Suspense fallback={<Spinner />}>
            {children}
          </React.Suspense>
        </ErrorBoundary>
      </Swipeable>
    </Freeze>
  );
}

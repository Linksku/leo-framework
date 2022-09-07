import { useAnimatedValue, useAnimation } from 'utils/hooks/useAnimation';
import Swipeable from 'components/frame/Swipeable';
import ErrorBoundary from 'components/ErrorBoundary';

import styles from './StackWrapOuterStyles.scss';

const SLIDE_MS = 200;

// todo: low/mid open last stack when swiping from right on home
export default function StackWrapOuter({
  children,
}: React.PropsWithChildren<unknown>) {
  const {
    path,
    isRouteActive,
    isRouteVisible,
    isStackTop,
    routeConfig,
  } = useRouteStore();
  const { isReplaced } = useHistoryStore();
  const { goBackStack } = useStacksNavStore();
  const showSlide = isStackTop && (!isReplaced || path === '/register');
  const slideIn = showSlide && isRouteActive;
  const slideOut = showSlide && !isRouteActive;
  const animatedLeftPercent = useAnimatedValue(slideIn ? 100 : 0, 'StackWrapOuter');
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();

  useEffect(() => {
    if (slideIn) {
      animatedLeftPercent.setVal(0, SLIDE_MS);
    } else if (slideOut) {
      animatedLeftPercent.setVal(100, SLIDE_MS);
    }
  }, [slideIn, slideOut, animatedLeftPercent]);

  return (
    <Swipeable
      ref={animationRef}
      swipeProps={{
        onNavigate: goBackStack,
        setPercent: (p, quick) => animatedLeftPercent.setVal(p, quick ? 50 : SLIDE_MS),
        direction: 'right',
        enabled: isRouteActive && !routeConfig.disableBackSwipe,
      }}
      style={animationStyle(animatedLeftPercent, {
        transform: x => `translateZ(0) translateX(${x}%)`,
      })}
      className={styles.container}
      hidden={!isRouteVisible}
    >
      <ErrorBoundary>
        <React.Suspense fallback={<Spinner />}>
          {children}
        </React.Suspense>
      </ErrorBoundary>
    </Swipeable>
  );
}

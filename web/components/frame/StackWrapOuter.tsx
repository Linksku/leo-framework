import { useAnimatedValue, useAnimation } from 'lib/hooks/useAnimation';
import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import mergeRefs from 'lib/mergeRefs';
import useTimeComponentPerf from 'lib/hooks/useTimeComponentPerf';
import ErrorBoundary from 'components/ErrorBoundary';

import styles from './StackWrapOuterStyles.scss';

export default function StackWrapOuter({
  children,
}: React.PropsWithChildren<unknown>) {
  const { path, isActiveRoute, isVisibleRoute, isStackTop } = useRouteStore();
  useTimeComponentPerf(`StackOuter:${path}`);

  const { backStack, stackActive, stackTop, stackBot } = useStacksNavStore();
  const { isReplaced } = useHistoryStore();

  const showSlide = isStackTop && (!isReplaced || path === '/register');
  const slideIn = showSlide && stackActive === stackTop;
  const slideOut = showSlide && stackActive === stackBot;
  const animatedLeftPercent = useAnimatedValue(slideIn ? 100 : 0, 'StackWrapOuter');
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();

  const { ref, bindSwipe } = useSwipeNavigation<HTMLDivElement>({
    onNavigate: backStack,
    setPercent: percent => animatedLeftPercent.setVal(percent, 300),
    direction: 'right',
    enabled: isActiveRoute,
  });

  useEffect(() => {
    if (slideIn) {
      animatedLeftPercent.setVal(0, 300);
    } else if (slideOut) {
      animatedLeftPercent.setVal(100, 300);
    }
  }, [slideIn, slideOut, animatedLeftPercent]);

  return (
    <div
      ref={mergeRefs(ref, animationRef)}
      style={animationStyle(animatedLeftPercent, {
        transform: x => `translateZ(0) translateX(${x}%)`,
      })}
      className={styles.container}
      hidden={!isVisibleRoute}
      {...bindSwipe()}
    >
      <ErrorBoundary>
        <React.Suspense fallback={<Spinner />}>
          {children}
        </React.Suspense>
      </ErrorBoundary>
    </div>
  );
}

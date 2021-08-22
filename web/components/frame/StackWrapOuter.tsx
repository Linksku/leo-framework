import { useAnimatedValue, useAnimation } from 'lib/hooks/useAnimation';
import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import mergeRefs from 'lib/mergeRefs';
import useTimeComponentPerf from 'lib/hooks/useTimeComponentPerf';
import ErrorBoundary from 'components/ErrorBoundary';

import styles from './StackWrapOuterStyles.scss';

export type Props = {
  slideIn?: boolean,
  slideOut?: boolean,
  path: string,
};

export default function StackWrapOuter({
  slideIn = false,
  slideOut = false,
  path,
  children,
}: React.PropsWithChildren<Props>) {
  useTimeComponentPerf(`StackOuter:${path}`);

  const animatedLeftPercent = useAnimatedValue(slideIn ? 100 : 0, 'StackWrapOuter');
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();
  const { backStack, forwardStack } = useStacksNavStore();

  const { ref, bindSwipe } = useSwipeNavigation({
    onNavigate: backStack,
    onCancelNavigate: forwardStack,
    setPercent: percent => animatedLeftPercent.setVal(percent, 300),
    direction: 'right',
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

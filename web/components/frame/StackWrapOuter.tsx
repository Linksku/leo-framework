import { useAnimatedValue, useAnimation } from 'lib/hooks/useAnimation';
import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import mergeRefs from 'lib/mergeRefs';
import useTimeComponentPerf from 'lib/hooks/useTimeComponentPerf';
import ErrorBoundary from 'components/ErrorBoundary';

import styles from './StackWrapOuterStyles.scss';

export type Props = {
  slideIn?: boolean,
  slideOut?: boolean,
};

export default function StackWrapOuter({
  slideIn = false,
  slideOut = false,
  children,
}: React.PropsWithChildren<Props>) {
  useTimeComponentPerf('StackOuter');

  const animatedLeftPercent = useAnimatedValue(slideIn ? 100 : 0);
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();
  const { backStack, forwardStack } = useStacksNavStore();

  const { ref, bindSwipe } = useSwipeNavigation({
    onNavigate: backStack,
    onCancelNavigate: forwardStack,
    setPercent: percent => animatedLeftPercent.setVal(percent),
    direction: 'right',
  });

  useEffect(() => {
    if (slideIn) {
      animatedLeftPercent.setVal(0);
    } else if (slideOut) {
      animatedLeftPercent.setVal(100);
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
        {children}
      </ErrorBoundary>
    </div>
  );
}

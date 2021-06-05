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

  const [left, setLeft] = useAnimatedValue({
    defaultValue: slideIn ? 100 : 0,
  });
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();
  const { backStack, forwardStack } = useStacksStore();

  const { ref, bindSwipe } = useSwipeNavigation({
    onNavigate: backStack,
    onCancelNavigate: forwardStack,
    setPercent: setLeft,
    direction: 'right',
  });

  useEffect(() => {
    if (slideIn) {
      setLeft(0);
    } else if (slideOut) {
      setLeft(100);
    }
  }, [slideIn, slideOut, setLeft]);

  return (
    <div
      ref={mergeRefs(ref, animationRef)}
      style={animationStyle(left, {
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

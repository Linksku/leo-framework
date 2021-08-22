import SyncSvg from '@fortawesome/fontawesome-free/svgs/solid/sync-alt.svg';

import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import { useAnimatedValue, useAnimation } from 'lib/hooks/useAnimation';
import mergeRefs from 'lib/mergeRefs';

import styles from './PullToRefreshStyles.scss';

const MAX_SPIN_TIMES = 100;

export type Props = {
  className?: string,
} & React.HTMLAttributes<HTMLDivElement>;

export default function PullToRefresh({
  children,
  className,
  ...props
}: React.PropsWithChildren<Props>) {
  const animatedTop = useAnimatedValue(0);
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();

  const { ref, bindSwipe } = useSwipeNavigation({
    onNavigate: () => {
      // Spin every 3 seconds.
      animatedTop.setVal(360 * MAX_SPIN_TIMES, 3000 * MAX_SPIN_TIMES);
      // @ts-ignore reload(true) is still supported
      window.location.reload(true);
    },
    setPercent: p => animatedTop.setVal(p),
    direction: 'down',
  });

  return (
    <div
      className={cn(styles.container, className)}
      {...props}
      {...bindSwipe()}
    >
      {children}

      <div
        ref={mergeRefs(ref, animationRef)}
        style={animationStyle(animatedTop, {
          top: x => `${Math.min(100, x)}px`,
          transform: x => `translateX(-50%) translateY(-100%) rotate(${x * 1.8}deg)`,
        })}
        className={styles.refreshSpinner}
      >
        <SyncSvg />
      </div>
    </div>
  );
}

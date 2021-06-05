import SyncSvg from '@fortawesome/fontawesome-free/svgs/solid/sync-alt.svg';

import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import { useAnimatedValue, useAnimation } from 'lib/hooks/useAnimation';
import mergeRefs from 'lib/mergeRefs';

import styles from './PullToRefreshStyles.scss';

export type Props = {
  className?: string,
} & React.HTMLAttributes<HTMLDivElement>;

export default function PullToRefresh({
  children,
  className,
  ...props
}: React.PropsWithChildren<Props>) {
  const [top, setTop] = useAnimatedValue({
    defaultValue: 0,
  });
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();

  const { ref, bindSwipe } = useSwipeNavigation({
    onNavigate: () => window.location.reload(true),
    setPercent: p => setTop(p),
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
        style={animationStyle(top, {
          top: x => `${x}px`,
          transform: x => `translateX(-50%) translateY(-100%) rotate(${x * 1.8}deg)`,
        })}
        className={styles.refreshSpinner}
      >
        <SyncSvg />
      </div>
    </div>
  );
}

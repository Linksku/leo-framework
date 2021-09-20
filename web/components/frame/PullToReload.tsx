import SyncSvg from '@fortawesome/fontawesome-free/svgs/solid/sync-alt.svg';

import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import { useAnimation } from 'lib/hooks/useAnimation';
import mergeRefs from 'lib/mergeRefs';

import styles from './PullToReloadStyles.scss';

export type Props = {
  className?: string,
} & React.HTMLAttributes<HTMLDivElement>;

const MAX_DEG = 270;
const MAX_TOP_PX = 130;

// todo: mid/mid create hook to animate spinner and reload
export default function PullToReload({
  children,
  className,
  ...props
}: React.PropsWithChildren<Props>) {
  const { reloadSpinnerDeg, reloadPage } = useUIFrameStore();
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();

  const { ref, bindSwipe } = useSwipeNavigation<HTMLDivElement>({
    onNavigate: () => {
      reloadPage();
    },
    setPercent: p => reloadSpinnerDeg.setVal(p / 100 * MAX_DEG),
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
        style={animationStyle(reloadSpinnerDeg, {
          top: x => `${Math.min(1, x / MAX_DEG) * MAX_TOP_PX}px`,
          transform: x => `translateX(-50%) translateY(-100%) rotate(${x + 90}deg)`,
        })}
        className={styles.reloadSpinner}
      >
        <div className={styles.reloadSpinnerInner}>
          <SyncSvg />
        </div>
      </div>
    </div>
  );
}

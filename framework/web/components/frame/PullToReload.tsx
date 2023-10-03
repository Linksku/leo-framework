import SyncSvg from 'fa5/svg/sync-alt-solid.svg';

import useSwipeNavigation from 'hooks/useSwipeNavigation';
import { useAnimation } from 'hooks/useAnimation';
import mergeRefs from 'utils/mergeRefs';

import styles from './PullToReloadStyles.scss';

export type Props = {
  className?: string,
} & React.HTMLAttributes<HTMLDivElement>;

const ELEM_DIM = 36;
const MAX_DEG = 270;

export default function PullToReload({
  children,
  className,
  ...props
}: React.PropsWithChildren<Props>) {
  const { reloadSpinnerDeg, reloadPage } = useUIFrameStore();
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>(
    reloadSpinnerDeg,
    'PullToReload',
  );

  const { ref, bindSwipe } = useSwipeNavigation<HTMLDivElement>({
    duration: 500,
    elementDim: ELEM_DIM * 3,
    onNavigate: useCallback(() => {
      reloadPage();
    }, [reloadPage]),
    setPercent(p, duration) {
      reloadSpinnerDeg.setVal(
        p / 100 * MAX_DEG,
        duration,
      );
    },
    direction: 'down',
  });

  return (
    <div
      className={cx(styles.container, className)}
      {...props}
      {...bindSwipe()}
    >
      {children}
      <div
        ref={mergeRefs(ref, animationRef)}
        style={animationStyle(
          {
            transform(x) {
              const remainingPercent = Math.max(0, 1 - (x / MAX_DEG));
              const temp = 1 - Math.max(0, remainingPercent ** 2);
              return `translateX(-50%) translateY(${(temp * 300) - 100}%) rotate(${x + 90}deg)`;
            },
          },
          {
            stylesForFinalVal: {
              0: { display: 'none' },
            },
            defaultEasing: 'linear',
          },
        )}
        className={styles.reloadSpinner}
      >
        <div className={styles.reloadSpinnerInner}>
          <SyncSvg />
        </div>
      </div>
    </div>
  );
}

import SyncSvg from 'svgs/fa5/sync-alt-solid.svg';

import useSwipeNavigation from 'hooks/useSwipeNavigation';
import { useAnimatedValue, useAnimation } from 'hooks/useAnimation';
import mergeRefs from 'utils/mergeRefs';

import styles from './PullToReload.scss';

export type Props = {
  className?: string,
} & React.HTMLAttributes<HTMLDivElement>;

const ELEM_DIM = 36;
const MAX_DISPLACEMENT = 3;
const RELOADING_MAX_ROTATIONS = 100;

export default function PullToReload({
  children,
  className,
  ...props
}: React.PropsWithChildren<Props>) {
  const { reloadPage, isReloadingPage } = useUIFrameStore();
  const reloadSpinnerPercent = useAnimatedValue(
    0,
    {
      debugName: 'ReloadSpinner',
      maxVal: RELOADING_MAX_ROTATIONS * 100,
    },
  );
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>(
    reloadSpinnerPercent,
    'PullToReload',
  );

  // todo: low/mid allow pull to reload past 100%
  const { ref, bindSwipe } = useSwipeNavigation<HTMLDivElement>({
    duration: 500,
    elementDim: ELEM_DIM * (MAX_DISPLACEMENT * 1.5),
    onNavigate: useCallback(() => {
      reloadPage();
    }, [reloadPage]),
    setPercent(p, duration) {
      reloadSpinnerPercent.setVal(p, duration, 'linear');
    },
    direction: 'down',
  });

  useEffect(() => {
    if (isReloadingPage) {
      reloadSpinnerPercent.setVal(
        RELOADING_MAX_ROTATIONS * 100,
        // This is overridden by styles.isReloading
        1,
      );
    }
  }, [isReloadingPage, reloadSpinnerPercent]);

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
              const eased = x > 100 ? x : Math.cbrt(x / 100) * 100;
              const rotate = ((eased / 100) * 270) + 90;
              return `translateX(-50%) rotate(${rotate}deg)`;
            },
            top(x) {
              const eased = x > 100 ? 100 : Math.cbrt(x / 100) * 100;
              const top = (eased * MAX_DISPLACEMENT) - 100;
              return `${top}%`;
            },
          },
          {
            stylesForFinalVal: {
              0: { display: 'none' },
            },
            defaultEasing: 'linear',
          },
        )}
        className={cx(styles.reloadSpinner, {
          [styles.isReloading]: isReloadingPage,
        })}
      >
        <div className={styles.reloadSpinnerInner}>
          <SyncSvg />
        </div>
      </div>
    </div>
  );
}

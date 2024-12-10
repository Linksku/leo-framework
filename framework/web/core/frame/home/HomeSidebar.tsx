import type { Props as SwipeProps } from 'core/useSwipeNavigation';
import Swipeable from 'core/frame/Swipeable';
import { useAnimation } from 'core/useAnimation';
import { HomeSidebarInner } from 'config/homeComponents';

import styles from './HomeSidebar.scss';

export default React.memo(function HomeSidebar() {
  const {
    sidebarLoaded,
    sidebarShownPercent,
    sidebarRef,
    sidebarStyle,
    hideSidebar,
  } = useUIFrameStore();

  const [overlayRef, overlayStyle] = useAnimation<HTMLDivElement>(
    sidebarShownPercent,
    'Sidebar:overlay',
  );

  const overlaySwipeProps = useMemo(() => ({
    onNavigate: () => hideSidebar(),
    setPercent(p, duration, { easing }) {
      sidebarShownPercent.setVal(
        100 - p,
        duration,
        easing,
      );
    },
    direction: 'left',
    elementRef: sidebarRef,
  } satisfies SwipeProps<HTMLDivElement>), [
    hideSidebar,
    sidebarRef,
    sidebarShownPercent,
  ]);
  const sidebarSwipeProps = useMemo(() => ({
    onNavigate: () => hideSidebar(),
    setPercent(p, duration, { easing }) {
      sidebarShownPercent.setVal(
        100 - p,
        duration,
        easing,
      );
    },
    direction: 'left',
    elementRef: sidebarRef,
  } satisfies SwipeProps<HTMLDivElement>), [
    hideSidebar,
    sidebarRef,
    sidebarShownPercent,
  ]);
  return (
    <>
      <Swipeable
        ref={overlayRef}
        swipeProps={overlaySwipeProps}
        style={overlayStyle(
          {
            opacity: x => x / 100,
            pointerEvents: (_, x) => (x < 50 ? 'none' : 'auto'),
          },
          {
            stylesForFinalVal: {
              0: { display: 'none' },
            },
            keyframes: [50],
          },
        )}
        className={styles.overlay}
        onClick={() => hideSidebar()}
        role="dialog"
      />
      <Swipeable
        ref={sidebarRef}
        swipeProps={sidebarSwipeProps}
        style={sidebarStyle({
          transform: x => `translateX(${x - 100}%)`,
        })}
        className={styles.sidebar}
      >
        {sidebarLoaded && <HomeSidebarInner />}
      </Swipeable>
    </>
  );
});

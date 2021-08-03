import type { AnimatedValue, AnimationStyle } from 'lib/hooks/useAnimation';

import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import { useHomeRouteStore } from 'stores/routes/HomeRouteStore';
import { HomeSidebarInner } from 'config/homeComponents';

import styles from './HomeSidebarStyles.scss';

type Props = {
  animatedSidebarPercent: AnimatedValue,
  sidebarRef: React.MutableRefObject<HTMLDivElement | null>,
  sidebarStyle: AnimationStyle,
  dialogRef: React.MutableRefObject<HTMLDivElement | null>,
  dialogStyle: AnimationStyle,
};

function HomeSidebar({
  animatedSidebarPercent,
  sidebarRef,
  sidebarStyle,
  dialogRef,
  dialogStyle,
}: Props) {
  const { sidebarShown, setSidebarShown } = useHomeRouteStore();
  const ref = useRef({
    hasSidebarShown: sidebarShown,
  });
  ref.current.hasSidebarShown ||= sidebarShown;

  const { bindSwipe } = useSwipeNavigation({
    onNavigate: () => setSidebarShown(false),
    setPercent: (p: number) => animatedSidebarPercent.setVal(100 - p),
    direction: 'left',
    elementRef: sidebarRef,
  });

  return (
    <>
      <div
        ref={dialogRef}
        style={dialogStyle(animatedSidebarPercent, {
          filter: x => `opacity(${x}%)`,
          display: x => (x < 1 ? 'none' : 'block'),
          pointerEvents: x => (x < 50 ? 'none' : 'auto'),
        }, [1, 50])}
        className={styles.overlay}
        onClick={() => setSidebarShown(false)}
        role="dialog"
        {...bindSwipe()}
      />
      <div
        ref={sidebarRef}
        style={sidebarStyle(animatedSidebarPercent, {
          transform: x => `translateX(${x - 100}%)`,
        })}
        className={styles.sidebar}
        {...bindSwipe()}
      >
        <React.Suspense fallback={<Spinner />}>
          {sidebarShown || ref.current.hasSidebarShown
            ? <HomeSidebarInner />
            : null}
        </React.Suspense>
      </div>
    </>
  );
}

export default React.memo(HomeSidebar);

import type { AnimatedValue, ValToStyle, Style } from 'lib/hooks/useAnimation';

import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import { useHomeRouteStore } from 'stores/routes/HomeRouteStore';
import { HomeSidebarInner } from 'config/homeComponents';

import styles from './HomeSidebarStyles.scss';

type Props = {
  sidebarPercent: AnimatedValue,
  setSidebarPercent: Memoed<(percent: number) => void>,
  sidebarRef: React.MutableRefObject<HTMLDivElement | null>,
  sidebarStyle: Memoed<(animatedValue: AnimatedValue, valToStyle: ValToStyle) => Style>,
  dialogRef: React.MutableRefObject<HTMLDivElement | null>,
  dialogStyle: Memoed<(animatedValue: AnimatedValue, valToStyle: ValToStyle) => Style>,
};

function HomeSidebar({
  sidebarPercent,
  setSidebarPercent,
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
    setPercent: (p: number) => setSidebarPercent(100 - p),
    direction: 'left',
    elementRef: sidebarRef,
  });

  return (
    <>
      <div
        ref={dialogRef}
        style={dialogStyle(sidebarPercent, {
          filter: x => `opacity(${x}%)`,
          display: x => (x < 1 ? 'none' : 'block'),
          pointerEvents: x => (x < 50 ? 'none' : 'auto'),
        })}
        className={styles.overlay}
        onClick={() => setSidebarShown(false)}
        role="dialog"
        {...bindSwipe()}
      />
      <div
        ref={sidebarRef}
        style={sidebarStyle(sidebarPercent, {
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

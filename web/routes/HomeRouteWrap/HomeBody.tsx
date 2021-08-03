import { useAnimatedValue, useAnimation } from 'lib/hooks/useAnimation';
import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';
import { useHomeRouteStore } from 'stores/routes/HomeRouteStore';

import HomeSidebar from './HomeSidebar';

import styles from './HomeBodyStyles.scss';

export type Props = Record<never, never>;

export default function HomeBody({ children }: React.PropsWithChildren<Props>) {
  const { sidebarShown, setSidebarShown } = useHomeRouteStore();
  const ref = useRef({
    isSwiping: false,
  });
  const animatedSidebarPercent = useAnimatedValue(sidebarShown ? 100 : 0);
  const [dialogRef, dialogStyle] = useAnimation<HTMLDivElement>();
  const [sidebarRef, sidebarStyle] = useAnimation<HTMLDivElement>();

  const { bindSwipe } = useSwipeNavigation({
    onStart() {
      setSidebarShown(true);
      ref.current.isSwiping = true;
    },
    onNavigate() {
      ref.current.isSwiping = false;
    },
    onCancelNavigate() {
      ref.current.isSwiping = false;
    },
    setPercent: percent => animatedSidebarPercent.setVal(percent),
    direction: 'right',
    elementRef: sidebarRef,
    maxSwipeStartDist: 30,
  });

  useEffect(() => {
    if (!ref.current.isSwiping) {
      animatedSidebarPercent.setVal(sidebarShown ? 100 : 0);
    }
  }, [animatedSidebarPercent, sidebarShown]);

  return (
    <>
      <div className={styles.sidebarWrap}>
        <HomeSidebar
          animatedSidebarPercent={animatedSidebarPercent}
          sidebarRef={sidebarRef}
          sidebarStyle={sidebarStyle}
          dialogRef={dialogRef}
          dialogStyle={dialogStyle}
        />
      </div>
      <div
        className={styles.body}
        {...bindSwipe()}
      >
        {children}
      </div>
    </>
  );
}

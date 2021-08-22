import { useAnimation } from 'lib/hooks/useAnimation';
import useSwipeNavigation from 'lib/hooks/useSwipeNavigation';

import HomeSidebar from './HomeSidebar';

import styles from './HomeBodyStyles.scss';

export type Props = Record<never, never>;

export default function HomeBody({ children }: React.PropsWithChildren<Props>) {
  const { sidebarShownPercent, loadSidebar } = useHomeNavStore();
  const [dialogRef, dialogStyle] = useAnimation<HTMLDivElement>();
  const [sidebarRef, sidebarStyle] = useAnimation<HTMLDivElement>();

  const { bindSwipe } = useSwipeNavigation({
    onStart() {
      loadSidebar();
    },
    setPercent: percent => sidebarShownPercent.setVal(percent),
    direction: 'right',
    elementRef: sidebarRef,
    maxSwipeStartDist: 30,
  });

  return (
    <>
      <div className={styles.sidebarWrap}>
        <HomeSidebar
          sidebarRef={sidebarRef}
          // todo: low/easy add helper for stable useCallback/useMemo with no deps
          // eslint-disable-next-line react-hooks/exhaustive-deps
          sidebarStyle={useCallback(sidebarStyle, [])}
          dialogRef={dialogRef}
          // eslint-disable-next-line react-hooks/exhaustive-deps
          dialogStyle={useCallback(dialogStyle, [])}
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

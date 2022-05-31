import { useAnimation } from 'utils/hooks/useAnimation';
import useSwipeNavigation from 'utils/hooks/useSwipeNavigation';

import { useShowHomeFooter } from 'config/homeFooterConfig';

import HomeSidebar from './HomeSidebar';

import styles from './HomeBodyStyles.scss';

export type Props = Record<never, never>;

export default function HomeBody({ children }: React.PropsWithChildren<Props>) {
  const { sidebarShownPercent, loadSidebar } = useUIFrameStore();
  const [dialogRef, dialogStyle] = useAnimation<HTMLDivElement>();
  const [sidebarRef, sidebarStyle] = useAnimation<HTMLDivElement>();

  const { bindSwipe } = useSwipeNavigation<HTMLDivElement>({
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
        className={cn(styles.body, {
          [styles.withFooter]: useShowHomeFooter(),
        })}
        {...bindSwipe()}
      >
        {children}
      </div>
    </>
  );
}

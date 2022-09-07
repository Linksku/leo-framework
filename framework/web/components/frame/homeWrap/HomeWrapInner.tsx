import Swipeable from 'components/frame/Swipeable';
import { useHomeFooterShown } from 'config/homeFooterConfig';
import ErrorBoundary from 'components/ErrorBoundary';
import LoadingRoute from 'routes/LoadingRoute';

import styles from './HomeWrapInnerStyles.scss';

export default function HomeWrapInner({
  children,
  className,
  innerClassName,
}: React.PropsWithChildren<{
  className?: string,
  innerClassName?: string,
}>) {
  const { isRouteVisible, innerContainerRef } = useRouteStore();
  const { loadSidebar, sidebarShownPercent, sidebarRef } = useUIFrameStore();

  return (
    <Swipeable
      ref={innerContainerRef}
      swipeProps={{
        onStart() {
          loadSidebar();
        },
        setPercent: (p, quick) => sidebarShownPercent.setVal(p, quick ? 50 : undefined),
        direction: 'right',
        elementRef: sidebarRef,
        maxSwipeStartDist: 50,
      }}
      className={cn(styles.container, {
        [styles.withFooter]: useHomeFooterShown(),
      }, className)}
    >
      <div
        className={cn(styles.inner, innerClassName)}
        hidden={!isRouteVisible}
      >
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingRoute />}>
            {children}
          </React.Suspense>
        </ErrorBoundary>
      </div>
    </Swipeable>
  );
}

import PullToReloadDeferred from 'components/frame/PullToReloadDeferred';
import StackWrapInnerTopBar from 'components/frame/stack/StackWrapInnerTopBar';
import LoadingRoute from 'routes/LoadingRoute';
import ErrorBoundary from 'components/ErrorBoundary';
import { useInnerContainerRef } from 'stores/RouteStore';

import styles from './StackWrapInnerStyles.scss';

type Props = {
  className?: string,
  bodyClassName?: string,
  bottomBar?: ReactElement,
  noScrollbar?: boolean,
} & Parameters<typeof StackWrapInnerTopBar>[0];

export default function StackWrapInner({
  children,
  className,
  bodyClassName,
  bottomBar,
  noScrollbar,
  ...props
}: React.PropsWithChildren<Props>) {
  const innerContainerRef = useInnerContainerRef();

  return (
    <div
      ref={innerContainerRef}
      className={cx(styles.container, className)}
    >
      <div className={styles.topBarWrap}>
        <PullToReloadDeferred>
          <StackWrapInnerTopBar {...props} />
        </PullToReloadDeferred>
      </div>

      <div
        className={cx(styles.body, {
          [styles.withScrollbar]: !noScrollbar,
        }, bodyClassName)}
      >
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingRoute />}>
            {noScrollbar
              ? children
              : (
                <div className={styles.withScrollbarInner}>
                  {children}
                </div>
              )}
          </React.Suspense>
        </ErrorBoundary>
      </div>

      {bottomBar
        ? (
          <div className={styles.bottomBarWrap}>
            <div className={styles.bottomBarInner}>
              {bottomBar}
            </div>
          </div>
        )
        : (
          <div className={styles.bottomSpacer} />
        )}
    </div>
  );
}

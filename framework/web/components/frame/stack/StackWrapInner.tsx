import PullToReloadDeferred from 'components/frame/PullToReloadDeferred';
import StackWrapInnerTopBar from 'components/frame/stack/StackWrapInnerTopBar';
import LoadingRoute from 'routes/LoadingRoute';
import ErrorBoundary from 'components/ErrorBoundary';
import { useInnerContainerRef } from 'stores/RouteStore';

import styles from './StackWrapInnerStyles.scss';

type Props = {
  greyBackground?: boolean,
  bottomColor?: string,
  bottomBar?: ReactElement,
  noScrollbar?: boolean,
  className?: string,
  bodyClassName?: string,
} & Parameters<typeof StackWrapInnerTopBar>[0];

export default function StackWrapInner({
  children,
  greyBackground,
  bottomColor,
  bottomBar,
  noScrollbar,
  className,
  bodyClassName,
  ...props
}: React.PropsWithChildren<Props>) {
  const innerContainerRef = useInnerContainerRef();

  return (
    <div
      className={cx(styles.container, className, {
        [styles.greyBackground]: greyBackground,
      })}
    >
      <div className={styles.topBarWrap}>
        <PullToReloadDeferred>
          <StackWrapInnerTopBar {...props} />
        </PullToReloadDeferred>
      </div>

      <div
        ref={innerContainerRef}
        className={cx(styles.body, {
          [styles.withScrollbar]: !noScrollbar,
        }, bodyClassName)}
      >
        <ErrorBoundary
          renderLoading={() => <LoadingRoute />}
        >
          {noScrollbar
            ? children
            : (
              <div className={styles.withScrollbarInner}>
                {children}
              </div>
            )}
          <div
            className={styles.bottomSpacer}
            style={{
              backgroundColor: bottomColor,
            }}
          />
        </ErrorBoundary>
      </div>

      {bottomBar && (
        <div className={styles.bottomBarWrap}>
          <div className={styles.bottomBarInner}>
            {bottomBar}
          </div>
        </div>
      )}
    </div>
  );
}

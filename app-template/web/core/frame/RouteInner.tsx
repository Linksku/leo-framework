import DocumentTitle from 'components/DocumentTitle';
import PageHeader from 'core/frame/PageHeader';

import styles from './RouteInner.scss';

export default function RouteInner({
  title,
  showHeader,
  className,
  children,
}: React.PropsWithChildren<{
  title: string,
  showHeader?: boolean,
  className?: string,
}>) {
  const { routeContainerRef, path } = useRouteStore();

  return (
    <>
      <DocumentTitle title={title} />
      {showHeader && (
        <div className={styles.header}>
          <PageHeader title={title} />
        </div>
      )}
      <div
        ref={routeContainerRef}
        data-route={path}
        className={cx(className, {
          [styles.withHeader]: showHeader,
        })}
      >
        {children}
      </div>
    </>
  );
}

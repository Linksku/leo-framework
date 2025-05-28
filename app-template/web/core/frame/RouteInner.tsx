import DocumentTitle from 'components/DocumentTitle';

export default function RouteInner({
  title,
  className,
  children,
}: React.PropsWithChildren<{
  title: string,
  className?: string,
}>) {
  const { routeContainerRef, path } = useRouteStore();

  return (
    <>
      <DocumentTitle title={title} />
      <div
        ref={routeContainerRef}
        data-route={path}
        className={className}
      >
        {children}
      </div>
    </>
  );
}

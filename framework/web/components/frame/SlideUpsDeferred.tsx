import type { Props } from './PullToReload';

const SlideUps = React.lazy(
  async () => import(/* webpackChunkName: 'deferred' */ './SlideUps'),
);

export default function SlideUpsDeferred({
  children,
  ...props
}: React.PropsWithChildren<Props>) {
  return (
    <React.Suspense
      fallback={null}
    >
      <SlideUps {...props}>
        {children}
      </SlideUps>
    </React.Suspense>
  );
}

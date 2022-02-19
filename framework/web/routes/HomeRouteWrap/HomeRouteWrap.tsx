import HomeRouteProvider from 'config/HomeRouteProvider';
import ErrorBoundary from 'components/ErrorBoundary';
import LoadingRoute from 'routes/LoadingRoute';

import HomeHeader from './HomeHeader';
import HomeBody from './HomeBody';
import HomeFooter from './HomeFooter';

import styles from './HomeRouteWrapStyles.scss';

type Props = React.PropsWithChildren<unknown>;

function HomeRouteWrap({ children }: Props) {
  const { isVisibleRoute } = useRouteStore();

  return (
    <div
      className={styles.container}
      hidden={!isVisibleRoute}
    >
      <HomeHeader />
      <HomeBody>
        <ErrorBoundary>
          <React.Suspense fallback={<LoadingRoute />}>
            {children}
          </React.Suspense>
        </ErrorBoundary>
      </HomeBody>
      <HomeFooter />
    </div>
  );
}

export default (props: Props) => (
  <HomeRouteProvider>
    <HomeRouteWrap {...props} />
  </HomeRouteProvider>
);

import { HomeRouteProvider } from 'stores/routes/HomeRouteStore';
import useTimeComponentPerf from 'lib/hooks/useTimeComponentPerf';
import ErrorBoundary from 'components/ErrorBoundary';

import HomeHeader from './HomeHeader';
import HomeBody from './HomeBody';
import HomeFooter from './HomeFooter';

import styles from './HomeRouteWrapStyles.scss';

type Props = React.PropsWithChildren<unknown>;

function HomeRouteWrap({ children }: Props) {
  useTimeComponentPerf('HomeRouteWrap');

  return (
    <div className={styles.container}>
      <HomeHeader />
      <HomeBody>
        <ErrorBoundary>
          {children}
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

import Router from 'Router';
import ErrorBoundary from 'components/ErrorBoundary';
import ErrorPage from 'components/ErrorPage';
import useTimeComponentPerf from 'hooks/useTimeComponentPerf';
import LoadingRoute from 'routes/LoadingRoute';

import { AlertsProvider } from 'stores/AlertsStore';
import { ApiProvider } from 'stores/ApiStore';
import { AuthProvider } from 'stores/AuthStore';
import { BatchImagesLoadProvider } from 'stores/BatchImagesLoadStore';
import { EntitiesProvider } from 'stores/EntitiesStore';
import { HistoryProvider } from 'stores/HistoryStore';
import { HomeNavProvider } from 'stores/HomeNavStore';
import { RelationsProvider } from 'stores/RelationsStore';
import { SseProvider } from 'stores/SseStore';
import { SlideUpProvider } from 'stores/SlideUpStore';
import { StacksNavProvider } from 'stores/StacksNavStore';
import { ToastsProvider } from 'stores/ToastsStore';
import { UIFrameProvider } from 'stores/UIFrameStore';
import providers from 'config/storeProviders';

export default function App() {
  useTimeComponentPerf('Render App');

  let router = <Router />;
  for (const Component of [
    // Lib
    HistoryProvider,

    // Core UI
    AlertsProvider,
    SlideUpProvider,
    ToastsProvider,
    UIFrameProvider,
    BatchImagesLoadProvider,

    // Core data
    EntitiesProvider,
    RelationsProvider,
    AuthProvider,
    ApiProvider,

    // Other data
    SseProvider,

    // Nav
    HomeNavProvider,
    StacksNavProvider,

    // Custom
    ...providers,
  ].reverse()) {
    router = <Component>{router}</Component>;
  }

  return (
    <ErrorBoundary
      renderLoading={() => <LoadingRoute />}
      renderError={msg => (
        <ErrorPage
          title="Error"
          content={msg}
        />
      )}
    >
      {router}
    </ErrorBoundary>
  );
}

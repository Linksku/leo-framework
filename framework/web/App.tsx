import Router from 'Router';
import ErrorBoundary from 'components/ErrorBoundary';
import useTimeComponentPerf from 'utils/hooks/useTimeComponentPerf';
import LoadingRoute from 'routes/LoadingRoute';

import { AlertsProvider } from 'stores/AlertsStore';
import { ApiProvider } from 'stores/ApiStore';
import { AuthProvider } from 'stores/AuthStore';
import { EntitiesProvider } from 'stores/EntitiesStore';
import { GlobalMemoProvider } from 'stores/GlobalMemoStore';
import { GlobalStateProvider } from 'stores/GlobalStateStore';
import { HistoryProvider } from 'stores/HistoryStore';
import { HomeNavProvider } from 'stores/HomeNavStore';
import { NotifsProvider } from 'stores/NotifsStore';
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
    GlobalMemoProvider,
    GlobalStateProvider,
    HistoryProvider,

    // Core UI
    AlertsProvider,
    SlideUpProvider,
    ToastsProvider,
    UIFrameProvider,

    // Core data
    EntitiesProvider,
    AuthProvider,
    ApiProvider,

    // Other data
    SseProvider,
    NotifsProvider,

    // Nav
    HomeNavProvider,
    StacksNavProvider,

    // Custom
    ...providers,
  ].reverse()) {
    router = <Component>{router}</Component>;
  }

  useEffect(() => {
    requestAnimationFrame(() => {
      document.body.style.display = 'block';
    });
  }, []);

  return (
    <ErrorBoundary>
      <React.Suspense fallback={<LoadingRoute />}>
        {router}
      </React.Suspense>
    </ErrorBoundary>
  );
}

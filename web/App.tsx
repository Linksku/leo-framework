import Router from 'Router';
import { AlertsProvider } from 'stores/AlertsStore';
import { AuthProvider } from 'stores/AuthStore';
import { EntitiesProvider } from 'stores/EntitiesStore';
import { GlobalMemoProvider } from 'stores/GlobalMemoStore';
import { GlobalStateProvider } from 'stores/GlobalStateStore';
import { HistoryProvider } from 'stores/HistoryStore';
import { HomeNavProvider } from 'stores/HomeNavStore';
import { SseProvider } from 'stores/SseStore';
import { SlideUpProvider } from 'stores/SlideUpStore';
import { StacksNavProvider } from 'stores/StacksNavStore';
import { ToastsProvider } from 'stores/ToastsStore';
import ErrorBoundary from 'components/ErrorBoundary';
import useTimeComponentPerf from 'lib/hooks/useTimeComponentPerf';

import providers from 'config/storeProviders';

export default function App() {
  useTimeComponentPerf('App');

  let router = <Router />;
  for (const Component of [
    // Lib
    GlobalMemoProvider,
    GlobalStateProvider,
    HistoryProvider,

    // UI
    AlertsProvider,
    SlideUpProvider,
    ToastsProvider,

    // Data
    EntitiesProvider,
    AuthProvider,
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
    <ErrorBoundary>
      {router}
    </ErrorBoundary>
  );
}

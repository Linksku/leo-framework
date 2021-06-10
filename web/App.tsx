import Router from 'Router';
import { AlertsProvider } from 'stores/AlertsStore';
import { AuthProvider } from 'stores/AuthStore';
import { EntitiesProvider } from 'stores/EntitiesStore';
import { GlobalMemoProvider } from 'stores/GlobalMemoStore';
import { HistoryProvider } from 'stores/HistoryStore';
import { SseProvider } from 'stores/SseStore';
import { SlideUpProvider } from 'stores/SlideUpStore';
import { StacksProvider } from 'stores/StacksStore';
import { ToastsProvider } from 'stores/ToastsStore';
import ErrorBoundary from 'components/ErrorBoundary';
import useTimeComponentPerf from 'lib/hooks/useTimeComponentPerf';

import providers from '../src/web/config/storeProviders';

export default function App() {
  useTimeComponentPerf('App');

  let router = <Router />;
  for (const Component of [
    // Core
    GlobalMemoProvider,
    HistoryProvider,
    StacksProvider,

    // UI
    AlertsProvider,
    SlideUpProvider,
    ToastsProvider,

    // Important
    EntitiesProvider,
    AuthProvider,
    SseProvider,

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

import { SplashScreen } from '@capacitor/splash-screen';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { StatusBar } from '@capacitor/status-bar';

import Router from 'core/router/Router';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import ErrorPage from 'core/frame/ErrorPage';
import useTimeComponentPerf from 'utils/useTimeComponentPerf';
import LoadingRoute from 'core/LoadingRoute';
import useEffectInitialMount from 'utils/useEffectInitialMount';
import detectPlatform from 'utils/detectPlatform';

import { ApiProvider } from 'stores/api/ApiStore';
import { AuthProvider } from 'stores/AuthStore';
import { BatchImagesLoadProvider } from 'stores/BatchImagesLoadStore';
import { EntitiesProvider } from 'stores/entities/EntitiesStore';
import { EntitiesIndexProvider } from 'stores/entities/EntitiesIndexStore';
import { HistoryProvider } from 'stores/history/HistoryStore';
import { NotifsProvider } from 'stores/NotifsStore';
import { SseProvider } from 'stores/sse/SseStore';
import { UIFrameProvider } from 'stores/UIFrameStore';
import providers from 'config/storeProviders';
import 'core/mainBundleImports';

export default function App() {
  useTimeComponentPerf('Render App');

  useEffectInitialMount(() => {
    SplashScreen.hide()
      .catch(err => {
        ErrorLogger.warn(err, { ctx: 'SplashScreen.hide' });
      });

    if (detectPlatform().isNative) {
      ScreenOrientation.lock({ orientation: 'portrait' })
        .catch(err => {
          ErrorLogger.warn(err, { ctx: 'ScreenOrientation.lock' });
        });

      StatusBar.setBackgroundColor({ color: '#ffffff' })
        .catch(err => {
          ErrorLogger.warn(err, { ctx: 'StatusBar.setBackgroundColor' });
        });
    }

    const effectTime = performance.now();
    const observer = new PerformanceObserver(entries => {
      let lcpTime: number | null = null;
      for (const entry of entries.getEntriesByType('largest-contentful-paint')) {
        lcpTime = entry.startTime;
      }

      EventLogger.track('Initial Load', {
        'LCP Time': lcpTime ? Math.round(lcpTime) : null,
        Time: Math.round(effectTime),
      });
    });
    observer.observe({
      buffered: true,
      type: 'largest-contentful-paint',
    });
  });

  let router = <Router />;
  for (const Component of [
    // Nav
    HistoryProvider,

    // UI
    BatchImagesLoadProvider,
    UIFrameProvider,

    // Core data
    EntitiesProvider,
    EntitiesIndexProvider,
    AuthProvider,
    ApiProvider,

    // Other data
    SseProvider,
    NotifsProvider,

    // Custom
    ...providers,
  ].reverse()) {
    router = <Component>{router}</Component>;
  }

  return (
    <ErrorBoundary
      loadingElem={<LoadingRoute />}
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

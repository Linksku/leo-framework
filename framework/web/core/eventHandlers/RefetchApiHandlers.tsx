import { App } from '@capacitor/app';

import { MAX_STALE_DURATION, MIN_STALE_DURATION } from 'stores/api/ApiStore';
import { requestIdleCallback, cancelIdleCallback } from 'utils/requestIdleCallback';
import useWindowEvent from 'utils/useWindowEvent';

export default function RefetchApiHandlers() {
  const { refetch, clearCache, getActiveApis } = useApiStore();

  const { curState } = useNavState();
  const latestCurState = useLatest(curState);
  useEffect(() => {
    let idleCallbackId: number | null = null;
    const clearCacheTimer = window.setInterval(() => {
      idleCallbackId = requestIdleCallback(() => {
        for (const api of getActiveApis()) {
          if ((!api.refetchIfStale && !api.cachedError)
            || !api.subs.some(sub => sub.routeKey === latestCurState.current.key)) {
            continue;
          }

          const diff = performance.now() - api.fetchSuccessTime;
          if (diff > MAX_STALE_DURATION
            || (api.cachedError && diff > MIN_STALE_DURATION)) {
            refetch(api.name, api.params, api.id);
          } else if (diff > MIN_STALE_DURATION) {
            clearCache(api.id);
          }
        }
      }, { timeout: 10_000 });
    }, MIN_STALE_DURATION / 2);

    return () => {
      window.clearInterval(clearCacheTimer);
      if (idleCallbackId) {
        cancelIdleCallback(idleCallbackId);
      }
    };
  }, [refetch, clearCache, latestCurState, getActiveApis]);

  // todo: high/blocked check refetch api causing unknown error
  const refetchActiveApis = useCallback((shouldRefetch: 'refetchOnFocus' | 'refetchOnConnect') => {
    for (const api of getActiveApis()) {
      if ((api[shouldRefetch] || api.cachedError)
        && performance.now() - api.fetchSuccessTime > MIN_STALE_DURATION
        && api.subs.some(sub => sub.routeKey === latestCurState.current.key)) {
        refetch(api.name, api.params, api.id);
      }
    }
  }, [getActiveApis, refetch, latestCurState]);

  useWindowEvent('online', useCallback(() => {
    refetchActiveApis('refetchOnConnect');
  }, [refetchActiveApis]));

  useEffect(() => {
    let remove: (() => void) | null = null;

    // Same as visibilitychange on web
    App.addListener('resume', () => {
      refetchActiveApis('refetchOnFocus');
    })
      .then(r => {
        remove = r.remove;
      })
      .catch(err => {
        ErrorLogger.warn(err, { ctx: 'App.addListener(resume)' });
      });

    return () => {
      remove?.();
    };
  }, [refetchActiveApis]);

  return null;
}

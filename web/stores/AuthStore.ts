import useLocalStorage from 'lib/hooks/useLocalStorage';
import { setErrorLoggerUserId } from 'lib/ErrorLogger';

const [
  AuthProvider,
  useAuthStore,
  useAuthToken,
] = constate(
  function AuthStore() {
    const [curAuthToken, setAuthToken, removeAuthToken] = useLocalStorage(
      'authToken',
      '',
      { raw: true },
    );
    const [state, setState] = useState({
      currentUserId: null as number | null,
      loggedInStatus: 'fetching' as 'fetching' | 'in' | 'out',
      isReloadingAfterAuth: false,
      authToken: curAuthToken ?? null,
    });
    const replacePath = useReplacePath();

    const setAuth = useCallback(({ authToken, redirectPath }: {
      authToken: string | null,
      redirectPath: string,
    }) => {
      if (authToken) {
        setAuthToken(authToken);
      } else {
        removeAuthToken();
      }

      batchedUpdates(() => {
        setState(s => ({
          ...s,
          isReloadingAfterAuth: true,
        }));
        replacePath(redirectPath);
        window.location.reload();
      });
    }, [setAuthToken, removeAuthToken, setState, replacePath]);

    const setCurrentUserId = useCallback((userId: Nullish<number>) => {
      setErrorLoggerUserId(userId);
      setState(s => (s.currentUserId === userId
        ? s
        : ({ ...s, currentUserId: userId ?? null })));
    }, [setState]);

    useApi('currentUser', {}, {
      shouldFetch: !!window.localStorage.getItem('authToken') && !state.isReloadingAfterAuth,
      onFetch: useCallback(data => {
        batchedUpdates(() => {
          setState(s => ({ ...s, loggedInStatus: 'in' }));
          setCurrentUserId(data.currentUserId);
        });
      }, [setCurrentUserId]),
      onError: useCallback(err => {
        setState(s => ({ ...s, loggedInStatus: 'out' }));
        if (err.status === 401 || err.status === 404) {
          window.localStorage.removeItem('authToken');
        }
      }, []),
    });

    return useDeepMemoObj({
      currentUserId: state.currentUserId,
      loggedInStatus: state.loggedInStatus,
      isReloadingAfterAuth: state.isReloadingAfterAuth,
      authToken: state.authToken,
      setAuth,
      setCurrentUserId,
    });
  },
  function AuthStore(val) {
    return val;
  },
  function AuthToken(val) {
    return val.authToken;
  },
);

export { AuthProvider, useAuthStore, useAuthToken };

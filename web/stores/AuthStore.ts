import useAuthTokenLS from 'lib/hooks/localStorage/useAuthTokenLS';
import { setErrorLoggerUserId } from 'lib/ErrorLogger';
import useUpdatedState from 'lib/hooks/useUpdatedState';

const [
  AuthProvider,
  useAuthStore,
  useAuthToken,
] = constate(
  function AuthStore() {
    const [authToken, setAuthToken, removeAuthToken] = useAuthTokenLS();
    const [isReloadingAfterAuth, setIsReloadingAfterAuth] = useState(false);

    const setAuth = useCallback(({ authToken: newAuthToken, redirectPath }: {
      authToken: string | null,
      // todo: mid/mid redirect to previous path
      redirectPath: string,
    }) => {
      if (newAuthToken) {
        setAuthToken(newAuthToken);
      } else {
        removeAuthToken();
      }

      batchedUpdates(() => {
        setIsReloadingAfterAuth(true);
        window.location.href = redirectPath;
      });
    }, [setAuthToken, removeAuthToken]);

    const {
      data: currentUserData,
      fetching,
      fetchingFirstTime,
    } = useApi('currentUser', {}, {
      shouldFetch: !!window.localStorage.getItem('authToken') && !isReloadingAfterAuth,
      onFetch(data) {
        setErrorLoggerUserId(data.currentUserId);
      },
      onError(err) {
        if (err.status === 401 || err.status === 404) {
          window.localStorage.removeItem('authToken');
        }
      },
    });

    const loggedInStatus = useUpdatedState<'unknown' | 'in' | 'out'>(
      authToken ? 'unknown' : 'out',
      prevStatus => {
        if (fetching) {
          return prevStatus;
        }
        return currentUserData?.currentUserId
          ? 'in'
          : 'out';
      },
    );

    return useDeepMemoObj({
      currentUserId: currentUserData?.currentUserId ?? null,
      currentUserClubIds: currentUserData?.clubIds ?? [],
      loggedInStatus,
      fetchingUserFirstTime: fetchingFirstTime,
      isReloadingAfterAuth,
      authToken,
      setAuth,
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

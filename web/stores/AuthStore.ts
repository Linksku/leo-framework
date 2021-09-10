import useAuthTokenLS from 'lib/hooks/localStorage/useAuthTokenLS';
import { setErrorLoggerUserId } from 'lib/ErrorLogger';

type LoggedInStatus = 'unknown' | 'in' | 'out';

const [
  AuthProvider,
  useAuthStore,
  useCurrentUserId,
] = constate(
  function AuthStore() {
    const [authToken, setAuthToken, removeAuthToken] = useAuthTokenLS();
    const [state, setState] = useState<{
      currentUserId: number | null,
      loggedInStatus: LoggedInStatus,
    }>({
      currentUserId: null,
      loggedInStatus: authToken ? 'unknown' : 'out',
    });
    const [isReloadingAfterAuth, setIsReloadingAfterAuth] = useState(false);

    const setAuth = useCallback(({
      authToken: newAuthToken,
      userId,
      redirectPath,
    }: {
      authToken: string | null,
      userId: number | null,
      // todo: mid/mid redirect to previous path
      redirectPath: string,
    }) => {
      batchedUpdates(() => {
        if (newAuthToken && userId) {
          setAuthToken(newAuthToken);
          setState({ currentUserId: userId, loggedInStatus: 'in' });
        } else {
          removeAuthToken();
          setState({ currentUserId: null, loggedInStatus: 'out' });
        }

        setIsReloadingAfterAuth(true);
        window.location.href = redirectPath;
      });
    }, [setAuthToken, removeAuthToken]);

    const fetchedCurrentUser = useCallback((currentUserId: number | null) => {
      setErrorLoggerUserId(currentUserId);
      setState({
        currentUserId,
        loggedInStatus: 'in',
      });
    }, []);

    return useDeepMemoObj({
      currentUserId: state.currentUserId,
      loggedInStatus: state.loggedInStatus,
      fetchedCurrentUser,
      isReloadingAfterAuth,
      authToken,
      setAuth,
    });
  },
  function AuthStore(val) {
    return val;
  },
  function CurrentUserId(val) {
    return val.currentUserId;
  },
);

export { AuthProvider, useAuthStore, useCurrentUserId };

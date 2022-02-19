import useAuthTokenLS from 'lib/hooks/localStorage/useAuthTokenLS';
import { setErrorLoggerUserId } from 'lib/ErrorLogger';

/*
in -> current user is set
out -> current user is null
unknown -> fetching user for first time
*/
type AuthStateType = 'unknown' | 'in' | 'out';

const [
  AuthProvider,
  useAuthStore,
  _useCurrentUserId,
  useAuthState,
] = constate(
  function AuthStore() {
    const [authToken, setAuthToken, removeAuthToken] = useAuthTokenLS();
    const [state, setState] = useState<{
      currentUserId: User['id'] | null,
      authState: AuthStateType,
    }>({
      currentUserId: null,
      authState: authToken ? 'unknown' : 'out',
    });
    const [isReloadingAfterAuth, setIsReloadingAfterAuth] = useState(false);

    const setAuth = useCallback(({
      authToken: newAuthToken,
      userId,
      redirectPath,
    }: {
      authToken: string | null,
      userId: User['id'] | null,
      // todo: mid/mid redirect to previous path
      redirectPath: string,
    }) => {
      batchedUpdates(() => {
        if (newAuthToken && userId) {
          setAuthToken(newAuthToken);
          setState({ currentUserId: userId, authState: 'in' });
        } else {
          removeAuthToken();
          setState({ currentUserId: null, authState: 'out' });
        }

        setIsReloadingAfterAuth(true);
        window.location.href = redirectPath;
      });
    }, [setAuthToken, removeAuthToken]);

    const fetchedCurrentUser = useCallback((currentUserId: User['id'] | null) => {
      setErrorLoggerUserId(currentUserId);
      setState({
        currentUserId,
        authState: currentUserId ? 'in' : 'out',
      });
    }, []);

    return useDeepMemoObj({
      currentUserId: state.currentUserId,
      authState: state.authState,
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
  function AuthState(val) {
    return val.authState;
  },
);

function useCurrentUserId(errorMessage: string): User['id'];

function useCurrentUserId(errorMessage?: null): User['id'] | null;

function useCurrentUserId(errorMessage?: string | null): User['id'] | null {
  const id = _useCurrentUserId();
  if (!id && errorMessage) {
    throw new Error(errorMessage);
  }
  return id;
}

export { AuthProvider, useAuthStore, useCurrentUserId, useAuthState };

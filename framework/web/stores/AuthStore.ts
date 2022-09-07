import useAuthTokenLS from 'utils/hooks/localStorage/useAuthTokenLS';
import { setErrorLoggerUserId } from 'services/ErrorLogger';

/*
in -> current user is set
out -> current user is null
fetching -> fetching user right after loading page
*/
type AuthStateType = 'in' | 'out' | 'fetching';

const [
  AuthProvider,
  useAuthStore,
  _useCurrentUserId,
  useAuthState,
] = constate(
  function AuthStore() {
    const [authToken, setAuthToken, removeAuthToken] = useAuthTokenLS();
    const [state, setState] = useStateStable<{
      currentUserId: IUser['id'] | null,
      authState: AuthStateType,
    }>({
      currentUserId: null,
      authState: authToken ? 'fetching' : 'out',
    });
    const [isReloadingAfterAuth, setIsReloadingAfterAuth] = useState(false);

    const setAuth = useCallback(({
      authToken: newAuthToken,
      userId,
      redirectPath,
    }: {
      authToken: string | null,
      userId: IUser['id'] | null,
      // todo: low/mid redirect to previous path
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
    }, [setAuthToken, removeAuthToken, setState]);

    const fetchedCurrentUser = useCallback((currentUserId: IUser['id'] | null) => {
      setErrorLoggerUserId(currentUserId);
      setState({
        currentUserId,
        authState: currentUserId ? 'in' : 'out',
      });
    }, [setState]);

    if (!process.env.PRODUCTION && !!state.currentUserId !== (state.authState === 'in')) {
      throw new Error('AuthStore: invalid authState');
    }

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

function useCurrentUserId(errorMessage: string): IUser['id'];

function useCurrentUserId(errorMessage?: null): IUser['id'] | null;

function useCurrentUserId(errorMessage?: string | null): IUser['id'] | null {
  const id = _useCurrentUserId();
  if (!id && errorMessage) {
    throw new Error(errorMessage);
  }
  return id;
}

export { AuthProvider, useAuthStore, useCurrentUserId, useAuthState };

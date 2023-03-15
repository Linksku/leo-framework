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
    const [{ currentUserId, authState }, setState] = useStateStable<{
      currentUserId: IUser['id'] | null,
      authState: AuthStateType,
    }>({
      // todo: mid/easy store last currentUserId in localStorage
      currentUserId: null,
      authState: authToken ? 'fetching' : 'out',
    });
    const [isReloadingAfterAuth, setIsReloadingAfterAuth] = useState(false);
    const catchAsync = useCatchAsync();

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
      if (newAuthToken && userId) {
        setAuthToken(newAuthToken);
        setState({ currentUserId: userId, authState: 'in' });
      } else {
        removeAuthToken();
        setState({ currentUserId: null, authState: 'out' });
      }

      setIsReloadingAfterAuth(true);
      window.location.href = redirectPath;
      catchAsync(Promise.reject(new Promise(NOOP)));
    }, [setAuthToken, removeAuthToken, setState, catchAsync]);

    const fetchedCurrentUser = useCallback((newCurrentUserId: IUser['id'] | null) => {
      setErrorLoggerUserId(newCurrentUserId);
      setState({
        currentUserId: newCurrentUserId,
        authState: newCurrentUserId ? 'in' : 'out',
      });
    }, [setState]);

    if (!process.env.PRODUCTION && !!currentUserId !== (authState === 'in')) {
      throw new Error('AuthStore: invalid authState');
    }

    return useMemo(() => ({
      currentUserId,
      authState,
      fetchedCurrentUser,
      isReloadingAfterAuth,
      authToken,
      setAuth,
    }), [currentUserId, authState, fetchedCurrentUser, isReloadingAfterAuth, authToken, setAuth]);
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

export {
  AuthProvider,
  useAuthStore,
  useCurrentUserId,
  useAuthState,
};

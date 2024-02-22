import useAuthTokenStorage from 'hooks/storage/useAuthTokenStorage';
import useCurrentUserIdStorage from 'hooks/storage/useCurrentUserIdStorage';
import { setErrorLoggerUserId } from 'services/ErrorLogger';

/*
in: fetched currentUser
out: null authToken, null currentUser
fetching: has authToken and maybe currentUserId, fetching currentUser
*/
type AuthStateType = 'in' | 'out' | 'fetching';

const [
  AuthProvider,
  useAuthStore,
  _useCurrentUserId,
  useAuthState,
] = constate(
  function AuthStore() {
    const [authToken, setAuthToken, removeAuthToken] = useAuthTokenStorage();
    const [currentUserIdLS, setCurrentUserIdLS, removeCurrentUserIdLS] = useCurrentUserIdStorage();
    const [{ currentUserId, authState }, setState] = useStateStable<{
      currentUserId: IUser['id'] | null,
      authState: AuthStateType,
    }>({
      currentUserId: authToken ? currentUserIdLS : null,
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
      redirectPath?: string,
    }) => {
      if (newAuthToken && userId) {
        setAuthToken(newAuthToken);
        setCurrentUserIdLS(userId);
        setState({ currentUserId: userId, authState: 'in' });
      } else {
        removeAuthToken();
        removeCurrentUserIdLS();
        setState({ currentUserId: null, authState: 'out' });
      }

      setIsReloadingAfterAuth(true);
      if (redirectPath) {
        // Note: Chrome can freeze after redirecting with devtools open, probably browser bug
        window.location.href = redirectPath;
      }
      catchAsync(Promise.reject(new Promise(NOOP)));
    }, [
      setAuthToken,
      removeAuthToken,
      setState,
      catchAsync,
      setCurrentUserIdLS,
      removeCurrentUserIdLS,
    ]);

    const fetchedCurrentUser = useCallback((newCurrentUserId: IUser['id'] | null) => {
      setErrorLoggerUserId(newCurrentUserId);
      setState({
        currentUserId: newCurrentUserId,
        authState: newCurrentUserId ? 'in' : 'out',
      });
      if (newCurrentUserId) {
        setCurrentUserIdLS(newCurrentUserId);
      } else {
        removeCurrentUserIdLS();
      }
    }, [setState, setCurrentUserIdLS, removeCurrentUserIdLS]);

    if (!process.env.PRODUCTION && (
      (!currentUserId && authState === 'in')
      || (currentUserId && authState === 'out')
    )) {
      ErrorLogger.error(new Error('AuthStore: invalid authState'));
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

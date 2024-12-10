import useAuthTokenStorage from 'core/storage/useAuthTokenStorage';
import useCurrentUserIdStorage from 'core/storage/useCurrentUserIdStorage';
import useLoggedInAsStorage from 'core/storage/useLoggedInAsStorage';
import { setErrorLoggerUserId } from 'services/ErrorLogger';
import { clearEventLoggerUser, setEventLoggerUser } from 'services/EventLogger';

const [
  AuthProvider,
  useAuthStore,
  _useCurrentUserId,
  useAuthState,
] = constate(
  function AuthStore() {
    const [authToken, setAuthToken, removeAuthToken] = useAuthTokenStorage();
    const [currentUserIdLS, setCurrentUserIdLS, removeCurrentUserIdLS] = useCurrentUserIdStorage();
    const [_, _2, removeLoggedInAs] = useLoggedInAsStorage();
    const [{ currentUserId, authState }, setState] = useStateStable<{
      currentUserId: IUser['id'] | null,
      /*
      in: fetched currentUser
      out: null authToken, null currentUser
      fetching: has authToken and maybe currentUserId, fetching currentUser
      */
      authState: 'in' | 'out' | 'fetching',
    }>({
      currentUserId: authToken ? currentUserIdLS : null,
      authState: authToken ? 'fetching' : 'out',
    });
    const [isReloadingAfterAuth, setIsReloadingAfterAuth] = useState(false);

    const pushPath = usePushPath();
    const replacePath = useReplacePath();
    const setAuth = useCallback(({
      authToken: newAuthToken,
      userId,
      redirectPath,
      replace,
    }: {
      authToken: string | null,
      userId: IUser['id'] | null,
      redirectPath: string,
      replace?: boolean,
    }) => {
      if (newAuthToken && userId) {
        setAuthToken(newAuthToken);
        setCurrentUserIdLS(userId);
        setState({ currentUserId: userId, authState: 'in' });
      } else {
        removeAuthToken();
        removeCurrentUserIdLS();
        removeLoggedInAs();
        setState({ currentUserId: null, authState: 'out' });
        clearEventLoggerUser();
      }

      if (replace) {
        replacePath(redirectPath, null, null, true);
      } else {
        pushPath(redirectPath, null, null, true);
      }

      setIsReloadingAfterAuth(true);
      setTimeout(() => {
        // @ts-expect-error reload(true) is still supported
        window.location.reload(true);
      }, 100);
    }, [
      setAuthToken,
      removeAuthToken,
      setState,
      setCurrentUserIdLS,
      removeCurrentUserIdLS,
      removeLoggedInAs,
      pushPath,
      replacePath,
    ]);

    const fetchedCurrentUser = useCallback((currentUser: Entity<'user'> | null) => {
      setErrorLoggerUserId(currentUser?.id);
      setEventLoggerUser(currentUser);

      setState({
        currentUserId: currentUser?.id ?? null,
        authState: currentUser ? 'in' : 'out',
      });
      if (currentUser) {
        setCurrentUserIdLS(currentUser?.id ?? null);
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

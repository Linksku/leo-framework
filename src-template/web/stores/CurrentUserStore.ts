import { setErrorLoggerUserId } from 'lib/ErrorLogger';

const [
  CurrentUserProvider,
  useCurrentUserStore,
  _useCurrentUser,
] = constate(
  function AuthStore() {
    const [currentUserId, setCurrentUserId] = useState<number | null>(null);
    const { isReloadingAfterAuth, setLoggedInStatus } = useAuthStore();
    const currentUser = useEntity('user', currentUserId);

    const {
      data: currentUserData,
      fetchingFirstTime,
    } = useApi('currentUser', {}, {
      shouldFetch: !!window.localStorage.getItem('authToken') && !isReloadingAfterAuth,
      onFetch(data) {
        setErrorLoggerUserId(data.currentUserId);
        // onFetch runs before SWR updates data, so without this, it's possible for:
        //   currentUserData.currentUserId = null, loggedInStatus = 'in'
        setCurrentUserId(data.currentUserId);
        setLoggedInStatus('in');
      },
      onError(err) {
        if (err.status === 401 || err.status === 404) {
          window.localStorage.removeItem('authToken');
        }
        setLoggedInStatus('out');
      },
    });

    return useDeepMemoObj({
      currentUserId: currentUserId ?? null,
      currentUser,
      fetchingUserFirstTime: fetchingFirstTime,
    });
  },
  function CurrentUserStore(val) {
    return val;
  },
  function CurrentUser(val) {
    return val.currentUser;
  },
);

function useCurrentUser(errorMessage: string): User;

function useCurrentUser(errorMessage?: null): User | null;

function useCurrentUser(errorMessage?: string | null): User | null {
  const currentUser = _useCurrentUser();
  if (!currentUser && errorMessage) {
    throw new Error(errorMessage);
  }
  return currentUser;
}

export { CurrentUserProvider, useCurrentUserStore, useCurrentUser };

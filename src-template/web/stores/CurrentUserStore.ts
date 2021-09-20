const [
  CurrentUserProvider,
  useCurrentUserStore,
  _useCurrentUser,
] = constate(
  function AuthStore() {
    const { currentUserId, isReloadingAfterAuth, fetchedCurrentUser } = useAuthStore();
    const currentUser = useEntity('user', currentUserId);

    const { fetchingFirstTime } = useApi('currentUser', {}, {
      shouldFetch: !!window.localStorage.getItem('authToken') && !isReloadingAfterAuth,
      onFetch(data) {
        // onFetch runs before SWR updates data, so without this, it's possible for:
        //   currentUserData.currentUserId = null, loggedInStatus = 'in'
        fetchedCurrentUser(data.currentUserId);
      },
      onError(err) {
        if (err.status === 401 || err.status === 404) {
          window.localStorage.removeItem('authToken');
        }
        fetchedCurrentUser(null);
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

function useCurrentUser(errorMessage: string): BaseUser;

function useCurrentUser(errorMessage?: null): BaseUser | null;

function useCurrentUser(errorMessage?: string | null): BaseUser | null {
  const currentUser = _useCurrentUser();
  if (!currentUser && errorMessage) {
    throw new Error(errorMessage);
  }
  return currentUser;
}

export { CurrentUserProvider, useCurrentUserStore, useCurrentUser };

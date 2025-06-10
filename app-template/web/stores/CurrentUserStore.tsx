import useAuthTokenStorage from 'core/storage/useAuthTokenStorage';
import CurrentUserAuthErrorModal from 'features/users/CurrentUserAuthErrorModal';
import { loadErrorLogger } from 'services/ErrorLogger';
import { loadEventLogger } from 'services/EventLogger';
import useGetEntity from 'stores/entities/useGetEntity';
import useLoggedInAsStorage from 'core/storage/useLoggedInAsStorage';

const [
  CurrentUserProvider,
  useCurrentUserStore,
] = constate(
  function CurrentUserStore() {
    const [authToken, _setAuthToken, removeAuthToken] = useAuthTokenStorage();
    const [loggedInAs] = useLoggedInAsStorage();

    const {
      authState,
      currentUserId,
      isReloadingAfterAuth,
      fetchedCurrentUser,
    } = useAuthStore();
    const currentUser = useEntity('user', currentUserId);
    const getUser = useGetEntity('user');

    const { isFirstFetch } = useApi(
      'currentUser',
      EMPTY_OBJ,
      {
        shouldFetch: !!authToken && !isReloadingAfterAuth,
        returnState: true,
        onFetch({
          currentUserId: newCurrentUserId,
        }) {
          // Without this, it's possible for:
          //   currentUserData.currentUserId = null, authState = 'in'
          fetchedCurrentUser(getUser(newCurrentUserId));
        },
        onError(err) {
          const status = TS.getProp(err, 'status');
          if (status === 401) {
            removeAuthToken();
            fetchedCurrentUser(null);
          } else if (isFirstFetch && status !== 429) {
            fetchedCurrentUser(null);
            showModal(<CurrentUserAuthErrorModal msg={err.message} />);
          }
        },
      },
    );

    useEffect(() => {
      if (authState !== 'fetching') {
        loadErrorLogger(currentUserId);
      }
    }, [authState, currentUserId]);

    useEffect(() => {
      if (authState !== 'fetching'
        && (!loggedInAs || !currentUser || loggedInAs !== currentUser.id)) {
        loadEventLogger(currentUser);
      }
    }, [authState, currentUser, loggedInAs]);

    return useMemo(() => ({
      currentUser,
      fetchingUserFirstTime: isFirstFetch,
    }), [
      currentUser,
      isFirstFetch,
    ]);
  },
  function CurrentUserStore(val) {
    return val;
  },
);

export {
  CurrentUserProvider,
  useCurrentUserStore,
};

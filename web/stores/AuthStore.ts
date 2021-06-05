import useLocalStorage from 'lib/hooks/useLocalStorage';

const [
  AuthProvider,
  useAuthStore,
  useAuthToken,
] = constate(
  function AuthStore() {
    const [curAuthToken, setAuthToken, removeAuthToken] = useLocalStorage(
      'authToken',
      '',
      { raw: true },
    );
    const [state, setState] = useState({
      currentUserId: null as number | null,
      isReloadingAfterAuth: false,
      authToken: curAuthToken ?? null,
    });
    const replacePath = useReplacePath();

    const setAuth = useCallback(({ authToken, redirectPath }: {
      authToken: string | null,
      redirectPath: string,
    }) => {
      if (authToken) {
        setAuthToken(authToken);
      } else {
        removeAuthToken();
      }

      batchedUpdates(() => {
        setState(s => ({
          ...s,
          isReloadingAfterAuth: true,
        }));
        replacePath(redirectPath);
        window.location.reload();
      });
    }, [setAuthToken, removeAuthToken, setState, replacePath]);

    const setCurrentUserId = useCallback((userId: Nullish<number>) => {
      setState(s => (s.currentUserId === userId
        ? s
        : ({ ...s, currentUserId: userId ?? null })));
    }, [setState]);

    return useDeepMemoObj({
      currentUserId: state.currentUserId,
      isReloadingAfterAuth: state.isReloadingAfterAuth,
      authToken: state.authToken,
      setAuth,
      setCurrentUserId,
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

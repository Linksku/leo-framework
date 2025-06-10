import ModalInner from 'core/frame/ModalInner';

export default function CurrentUserAuthErrorModal({ msg }: { msg: string }) {
  const { setAuth } = useAuthStore();
  const reloadPage = useReloadPage();

  return (
    <ModalInner
      title="Error fetching user"
      textAlign="center"
    >
      <p>
        {msg
          ? `Error occurred while fetching your user data: ${msg}`
          : 'Unknown error occurred while fetching your user data.'}
      </p>
      <p>
        This is likely a temporary server issue which will resolve itself later.
      </p>
      <p>
        {'You can try to '}
        <Link
          onClick={() => {
            if (typeof reloadPage === 'function') {
              reloadPage();
            } else {
              // @ts-expect-error reload(true) is still supported
              window.location.reload(true);
            }
          }}
          blue
        >
          reload
        </Link>
        {' the page, '}
        <Link
          onClick={() => {
            setAuth({ authToken: null, userId: null, redirectPath: '/login' });
          }}
          blue
        >
          log out
        </Link>
        {' and log back in, or restart the app.'}
      </p>
    </ModalInner>
  );
}

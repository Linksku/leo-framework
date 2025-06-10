import HomeSvg from 'svgs/fa5/regular/home.svg';
import UserSvg from 'svgs/fa5/regular/user.svg';
import LoginSvg from 'svgs/fa5/regular/sign-in-alt.svg';

import RouteInner from 'core/frame/RouteInner';

import styles from './VerifyEmailRoute.scss';

export default React.memo(function VerifyEmailRoute() {
  const { token: _token } = useRouteQuery<'VerifyEmail'>();
  const token = typeof _token === 'string' ? _token : undefined;
  const currentUserId = useCurrentUserId();

  const { fetchApi, data, error } = useDeferredApi(
    'verifyEmail',
    EMPTY_OBJ,
    {
      type: 'update',
      shouldFetch: !!token,
      returnState: true,
    },
  );

  useEffect(() => {
    if (token) {
      fetchApi({ token });
    }
  }, [fetchApi, token]);

  return (
    <RouteInner
      title="Verify Email"
      className={styles.container}
    >
      <h2 className={styles.title}>
        {(() => {
          if (!token || error) {
            return error?.message || 'Invalid token';
          }
          if (data?.hasVerified) {
            return 'Email verified';
          }
          return 'Verifying...';
        })()}
      </h2>
      {data?.hasVerified && (
        <p className={styles.msg}>
          Thank you for verifying your email address.
        </p>
      )}
      <Button
        href="/"
        LeftSvg={HomeSvg}
        label="Home"
        fullWidth
        overrides={{
          marginTop: '5rem',
          marginBottom: '2rem',
        }}
      />
      {currentUserId
        ? (
          <Button
            href={`/user/${currentUserId}`}
            LeftSvg={UserSvg}
            label="Go to profile"
            fullWidth
            overrides={{
              marginBottom: '2rem',
            }}
          />
        )
        : (
          <Button
            href="/login"
            LeftSvg={LoginSvg}
            label="Log in"
            fullWidth
            overrides={{
              marginBottom: '2rem',
            }}
          />
        )}
    </RouteInner>
  );
});

import HomeSvg from 'svgs/fa5/home-regular.svg';
import UserSvg from 'svgs/fa5/user-regular.svg';
import LoginSvg from 'svgs/fa5/sign-in-alt-regular.svg';

import StackWrapInner from 'components/frame/stack/StackWrapInner';

import styles from './VerifyEmailRoute.scss';

export default React.memo(function VerifyEmailRoute() {
  const { token: _token } = useRouteQuery();
  const token = typeof _token === 'string' ? _token : undefined;
  const currentUserId = useCurrentUserId();

  const { data, error } = useApi(
    'verifyEmail',
    useMemo(() => ({
      token: token as string,
    }), [token]),
    {
      shouldFetch: !!token,
      returnState: true,
    },
  );

  return (
    <StackWrapInner title="Verify Email">
      <div className={styles.container}>
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
              overrides={{
                marginBottom: '2rem',
              }}
            />
          )}
      </div>
    </StackWrapInner>
  );
});

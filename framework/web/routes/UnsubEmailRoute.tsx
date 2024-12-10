import BellSvg from 'svgs/fa5/bell-regular.svg';
import BellSlashSvg from 'svgs/fa5/bell-slash-regular.svg';
import HomeSvg from 'svgs/fa5/home-regular.svg';

import StackWrapInner from 'core/frame/stack/StackWrapInner';

import styles from './UnsubEmailRoute.scss';

export default React.memo(function UnsubEmailRoute() {
  const { token: _token } = useRouteQuery<'UnsubEmail'>();
  const token = typeof _token === 'string' ? _token : undefined;

  const {
    fetchApi,
    fetching,
    data,
    error,
  } = useDeferredApi(
    'toggleUnsubEmail',
    EMPTY_OBJ,
    {
      type: 'create',
      shouldFetch: !!token,
      returnState: true,
    },
  );

  useEffect(() => {
    if (token) {
      fetchApi({ type: 'unsub', token });
    }
  }, [fetchApi, token]);

  return (
    <StackWrapInner title="Unsubscribe Email">
      <div className={styles.container}>
        <h2 className={styles.title}>
          {(() => {
            if (!token || error) {
              return error?.message || 'Invalid token';
            }
            if (data?.isSubbed === false) {
              return data.email
                ? `Successfully unsubscribed ${data.email}`
                : 'Unsubscribed successfully';
            }
            if (data?.isSubbed === true) {
              return data.email
                ? `Successfully subscribed ${data.email}`
                : 'Subscribed successfully';
            }
            return 'Unsubscribing...';
          })()}
        </h2>
        <Button
          LeftSvg={data?.isSubbed === false ? BellSvg : BellSlashSvg}
          label={data?.isSubbed === false ? 'Re-subscribe' : 'Unsubscribe'}
          onClick={() => {
            fetchApi({
              type: data?.isSubbed === false ? 'sub' : 'unsub',
              token: TS.defined(token),
            });
          }}
          disabled={!token || fetching}
          overrides={{
            marginTop: '5rem',
            marginBottom: '2rem',
          }}
        />
        <Button
          href="/"
          LeftSvg={HomeSvg}
          label="Home"
        />
      </div>
    </StackWrapInner>
  );
});

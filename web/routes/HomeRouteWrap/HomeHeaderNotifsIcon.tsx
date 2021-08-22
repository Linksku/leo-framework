import BellSvg from '@fortawesome/fontawesome-free/svgs/regular/bell.svg';

import styles from './HomeHeaderNotifsIconStyles.scss';

export default function HomeHeaderNotifsIcon() {
  const { loggedInStatus } = useAuthStore();
  const { data } = useApi(
    'notifsCount',
    EMPTY_OBJ,
    {
      shouldFetch: loggedInStatus !== 'out',
    },
  );
  const count = data?.count ?? 0;

  return (
    <>
      <BellSvg />
      {count
        ? (
          <span className={styles.notifsCount}>
            <span>{count}</span>
          </span>
        )
        : null}
    </>
  );
}

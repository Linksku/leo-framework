import BellSvg from '@fortawesome/fontawesome-free/svgs/regular/bell.svg';
import UserSvg from '@fortawesome/fontawesome-free/svgs/regular/user.svg';

import PullToRefresh from 'components/frame/PullToRefresh';
import { useHomeRouteStore } from 'stores/routes/HomeRouteStore';
import homeHeaderLinks from 'config/homeHeaderLinks';
import HomeHeaderSelector from './HomeHeaderSelector';

import styles from './HomeHeaderStyles.scss';

function HomeHeader() {
  const currentUser = useCurrentUser();
  const { setSidebarShown } = useHomeRouteStore();
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
    <PullToRefresh className={styles.container}>
      <div className={styles.containerInner}>
        <HomeHeaderSelector onClick={() => setSidebarShown(s => !s)} />
        {homeHeaderLinks.map(({ path, Svg, label }) => (
          <a
            key={path}
            href={path}
            className={styles.rightIcon}
            aria-label={label}
          >
            <Svg />
          </a>
        ))}
        <a href="/notifications" className={styles.rightIcon}>
          <BellSvg />
          {count
            ? (
              <span className={styles.notifsCount}>
                <span>{count}</span>
              </span>
            )
            : null}
        </a>
        <a
          href={currentUser ? `/user/${currentUser.id}` : '/login'}
          className={styles.rightIcon}
        >
          <UserSvg />
        </a>
      </div>
    </PullToRefresh>
  );
}

export default React.memo(HomeHeader);

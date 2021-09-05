import UserSvg from '@fortawesome/fontawesome-free/svgs/regular/user.svg';

import PullToRefresh from 'components/frame/PullToRefresh';
import homeHeaderIcons from 'config/homeHeaderIcons';
import HomeHeaderSelector from './HomeHeaderSelector';
import HomeHeaderNotifsIcon from './HomeHeaderNotifsIcon';

import styles from './HomeHeaderStyles.scss';

function HomeHeader() {
  const currentUser = useCurrentUser();
  const { loggedInStatus } = useAuthStore();

  const icons = [
    ...homeHeaderIcons,
    {
      path: '/notifications',
      Component: HomeHeaderNotifsIcon,
      label: 'Notifications',
      authOnly: true,
    },
    {
      path: currentUser ? `/user/${currentUser.id}` : '/login',
      Component: UserSvg,
      label: 'User',
      authOnly: false,
    },
  ];

  return (
    <PullToRefresh className={styles.container}>
      <div className={styles.containerInner}>
        <HomeHeaderSelector />
        {icons
          .filter(({ authOnly }) => loggedInStatus !== 'out' || !authOnly)
          .map(({ path, Component, label }) => (
            <a
              key={path}
              href={path}
              className={styles.rightIcon}
              aria-label={label}
            >
              <Component />
            </a>
          ))}
      </div>
    </PullToRefresh>
  );
}

export default React.memo(HomeHeader);

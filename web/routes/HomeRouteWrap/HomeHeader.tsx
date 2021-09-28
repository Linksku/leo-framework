import UserSvg from '@fortawesome/fontawesome-free/svgs/regular/user.svg';

import PullToReload from 'components/frame/PullToReload';
import homeHeaderIcons from 'config/homeHeaderIcons';
import HomeHeaderSelector from './HomeHeaderSelector';
import HomeHeaderNotifsIcon from './HomeHeaderNotifsIcon';

import styles from './HomeHeaderStyles.scss';

function HomeHeader() {
  const currentUserId = useCurrentUserId();
  const authState = useAuthState();

  const icons = [
    ...homeHeaderIcons,
    {
      path: '/notifications',
      Component: HomeHeaderNotifsIcon,
      label: 'Notifications',
      authOnly: true,
    },
    {
      path: currentUserId ? `/user/${currentUserId}` : '/login',
      Component: UserSvg,
      label: 'User',
      authOnly: false,
    },
  ];

  return (
    <PullToReload className={styles.container}>
      <div className={styles.containerInner}>
        <HomeHeaderSelector />
        {icons
          .filter(({ authOnly }) => authState === 'in' || !authOnly)
          .map(({ path, Component, label }) => (
            <Link
              key={path}
              href={path}
              className={styles.rightIcon}
              aria-label={label}
            >
              <Component />
            </Link>
          ))}
      </div>
    </PullToReload>
  );
}

export default React.memo(HomeHeader);

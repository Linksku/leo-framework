import RouteInner from 'core/frame/RouteInner';
import { APP_NAME } from 'config';

import styles from './HomeRoute.scss';

export default function HomeRoute() {
  const currentUser = useCurrentUser();

  return (
    <RouteInner
      title={APP_NAME}
      className={styles.container}
    >
      <h2 className={styles.title}>Welcome</h2>
      <p className={styles.content}>To start, edit app/web/routes/HomeRoute.tsx</p>
      {currentUser
        ? <p>{`Logged in as ${currentUser.email}`}</p>
        : (
          <p>
            <Link href="/login" blue>Login</Link>
            {' '}
            <Link href="/register" blue>Register</Link>
          </p>
        )}
    </RouteInner>
  );
}

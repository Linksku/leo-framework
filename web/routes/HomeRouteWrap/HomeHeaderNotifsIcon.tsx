import BellSvg from '@fortawesome/fontawesome-free/svgs/regular/bell.svg';

import HomeHeaderIconUnreadCount from './HomeHeaderIconUnreadCount';

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
      <HomeHeaderIconUnreadCount count={count} />
    </>
  );
}

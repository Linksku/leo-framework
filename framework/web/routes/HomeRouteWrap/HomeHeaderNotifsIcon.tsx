import BellSvg from 'fontawesome5/svgs/regular/bell.svg';

import HomeHeaderIconUnreadCount from './HomeHeaderIconUnreadCount';

export default function HomeHeaderNotifsIcon() {
  const { unseenNotifIds } = useNotifsStore();
  const count = useMemo(() => {
    let total = 0;
    for (const [k, v] of TS.objEntries(unseenNotifIds)) {
      if (k !== 'chatReplyCreated') {
        total += v.size;
      }
    }
    return total;
  }, [unseenNotifIds]);

  return (
    <>
      <BellSvg />
      <HomeHeaderIconUnreadCount count={count} />
    </>
  );
}

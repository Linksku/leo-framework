import type { HandleClickLink } from 'components/common/Link';

import styles from './TabsHeader.scss';

export default function TabsHeader<T extends string>({
  tabs,
  activeTab,
  setTab,
}: {
  tabs: Nullish<{
    key: T,
    Icon?: React.SVGFactory,
    name: string,
    onClick?: HandleClickLink,
  }>[],
  activeTab?: T,
  setTab: (tab: T) => void,
}) {
  return (
    <div className={styles.tabs}>
      {TS.filterNulls(tabs).map(({
        key,
        Icon,
        name,
        onClick,
      }) => (
        <Link
          key={key}
          className={cx(styles.tab, {
            [styles.withIcon]: !!Icon,
            [styles.tabActive]: key === activeTab,
          })}
          onClick={e => {
            setTab(key);
            onClick?.(e);
          }}
          activeBg
        >
          {Icon && <Icon />}
          {name}
        </Link>
      ))}
    </div>
  );
}

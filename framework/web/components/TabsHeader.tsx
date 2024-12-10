import type { HandleClickLink } from 'components/common/Link';
import styles from './TabsHeader.scss';

export default function TabsHeader<T extends string>({
  tabs,
  activeTab,
  setTab,
}: {
  tabs: Nullish<{
    key: T,
    name: string,
    onClick?: HandleClickLink,
  }>[],
  activeTab?: T,
  setTab: (tab: T) => void,
}) {
  return (
    <div className={styles.tabs}>
      {TS.filterNulls(tabs).map(tab => (
        <Link
          key={tab.key}
          className={cx(styles.tab, {
            [styles.tabActive]: tab.key === activeTab,
          })}
          onClick={e => {
            setTab(tab.key);
            tab.onClick?.(e);
          }}
          activeBg
        >
          {tab.name}
        </Link>
      ))}
    </div>
  );
}

import type { HandleClickLink } from 'components/ui/Link';
import styles from './TabsHeaderStyles.scss';

type Props = {
  tabs: {
    key: string,
    name: string,
    onClick: HandleClickLink,
  }[],
  activeTab?: string,
};

export default function TabsHeader({
  tabs,
  activeTab,
}: Props) {
  return (
    <div className={styles.tabs}>
      {tabs.map(tab => (
        <Link
          key={tab.key}
          className={cx(styles.tab, {
            [styles.tabActive]: tab.key === activeTab,
          })}
          onClick={tab.onClick}
        >
          {tab.name}
        </Link>
      ))}
    </div>
  );
}

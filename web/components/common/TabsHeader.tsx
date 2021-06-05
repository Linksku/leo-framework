import styles from './TabsHeaderStyles.scss';

type Props = {
  tabs: {
    key: string,
    name: string,
    onClick: React.MouseEventHandler,
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
        <div
          key={tab.key}
          className={cn(styles.tab, {
            [styles.tabActive]: tab.key === activeTab,
          })}
          onClick={tab.onClick}
          role="button"
          tabIndex={-1}
        >
          {tab.name}
        </div>
      ))}
    </div>
  );
}

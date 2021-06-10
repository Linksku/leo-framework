import { TAB_ICONS } from 'config/homeTabs';
import { useHomeRouteStore } from 'stores/routes/HomeRouteStore';

import styles from './HomeFooterStyles.scss';

function HomeFooter() {
  const { navigateHome, homeTab, homeParts } = useHomeRouteStore();

  // todo: mid/hard add explore page
  return (
    <div className={styles.container}>
      <div className={styles.containerInner}>
        {(Object.keys(TAB_ICONS) as (keyof typeof TAB_ICONS)[]).map(tab => {
          const Svg = TAB_ICONS[tab];
          return (
            <div
              key={tab}
              onClick={() => navigateHome(tab, ...homeParts)}
              className={cn(styles.tabIcon, {
                [styles.tabActive]: homeTab === tab,
              })}
              role="button"
              tabIndex={-1}
            >
              <Svg />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default React.memo(HomeFooter);

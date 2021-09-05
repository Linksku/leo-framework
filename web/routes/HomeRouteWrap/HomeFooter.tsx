import { ICON_COMPONENTS, SMALL_ICONS, useShowHomeFooter } from 'config/homeFooterConfig';

import styles from './HomeFooterStyles.scss';

const DBL_CLICK_DELAY = 500;

function HomeFooter() {
  const { navigateHome, homeTab, homeParts } = useHomeNavStore();
  const lastClickedRef = useRef<ObjectOf<number>>({});

  if (!useShowHomeFooter()) {
    return null;
  }
  // todo: mid/hard add explore page
  return (
    <div className={styles.container}>
      <div className={styles.containerInner}>
        {TS.objectEntries(ICON_COMPONENTS).map(([tab, Component]) => (
          <div
            key={tab}
            onClick={() => {
              const lastClicked = lastClickedRef.current[tab];
              lastClickedRef.current[tab] = performance.now();
              if (homeTab === tab
                && lastClicked
                && performance.now() - lastClicked < DBL_CLICK_DELAY) {
                navigateHome(tab);
              } else {
                navigateHome(tab, ...homeParts);
              }
            }}
            className={cn(styles.tabIcon, {
              [styles.smallTabIcon]: SMALL_ICONS.has(tab),
              [styles.tabActive]: homeTab === tab,
            })}
            role="button"
            tabIndex={-1}
          >
            <Component />
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(HomeFooter);

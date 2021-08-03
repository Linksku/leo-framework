import { TAB_ICONS } from 'config/homeTabs';

import styles from './HomeFooterStyles.scss';

const DBL_CLICK_DELAY = 500;

function HomeFooter() {
  const { navigateHome, homeTab, homeParts } = useHomeNavStore();
  const lastClickedRef = useRef<ObjectOf<number>>({});

  // todo: mid/hard add explore page
  return (
    <div className={styles.container}>
      <div className={styles.containerInner}>
        {objectEntries(TAB_ICONS).map(([tab, Svg]) => (
          <div
            key={tab}
            onClick={() => {
              const lastClicked = lastClickedRef.current[tab];
              lastClickedRef.current[tab] = performance.now();
              if (homeTab === tab
                && lastClicked
                && performance.now() - lastClicked < DBL_CLICK_DELAY) {
                navigateHome(tab);
              }
              navigateHome(tab, ...homeParts);
            }}
            onDoubleClick={homeTab === tab ? () => navigateHome(tab) : undefined}
            className={cn(styles.tabIcon, {
              [styles.tabActive]: homeTab === tab,
            })}
            role="button"
            tabIndex={-1}
          >
            <Svg />
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(HomeFooter);

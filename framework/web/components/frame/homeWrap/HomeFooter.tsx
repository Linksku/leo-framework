import { ICONS_CONFIG, useHomeFooterShown } from 'config/homeFooterConfig';

import styles from './HomeFooterStyles.scss';

const DBL_CLICK_DELAY = 500;

function HomeFooter() {
  const { homeTab, homeParts } = useHomeNavStore();
  const replaceHome = useReplaceHome();
  const lastClickedRef = useRef<ObjectOf<number>>({});

  if (!useHomeFooterShown()) {
    return null;
  }
  // todo: mid/hard add explore page
  return (
    <div className={styles.container}>
      <div className={styles.containerInner}>
        {ICONS_CONFIG.map(({ key, RegularIcon, FilledIcon, isSmall }) => (
          <div
            key={key}
            onClick={() => {
              const lastClicked = lastClickedRef.current[key];
              lastClickedRef.current[key] = performance.now();
              if (homeTab === key
                && lastClicked
                && performance.now() - lastClicked < DBL_CLICK_DELAY) {
                replaceHome(key);
              } else {
                replaceHome(key, ...homeParts);
              }
            }}
            className={cn(styles.tabIcon, {
              [styles.smallTabIcon]: isSmall,
              [styles.tabActive]: homeTab === key,
            })}
            role="button"
            tabIndex={-1}
            aria-label={key}
          >
            {homeTab === key
              ? <FilledIcon />
              : <RegularIcon />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default React.memo(HomeFooter);

import PullToReloadDeferred from 'components/frame/PullToReloadDeferred';
import { HomeHeaderInner, HomeFooterInner } from 'config/homeComponents';

import HomeSidebar from './HomeSidebar';

import styles from './HomeFrameStyles.scss';

export default React.memo(function HomeFrame() {
  return (
    <>
      <div className={styles.header}>
        <PullToReloadDeferred>
          <div className={styles.headerInner}>
            <HomeHeaderInner />
          </div>
        </PullToReloadDeferred>
      </div>

      <HomeSidebar />

      <div className={styles.footer}>
        <div className={styles.footerInner}>
          <HomeFooterInner />
        </div>
      </div>
    </>
  );
});

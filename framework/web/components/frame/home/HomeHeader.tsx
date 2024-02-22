import PullToReloadDeferred from 'components/frame/PullToReloadDeferred';
import { HomeHeaderInner } from 'config/homeComponents';

import styles from './HomeHeader.scss';

export default React.memo(function HomeHeader() {
  return (
    <div className={styles.header}>
      <PullToReloadDeferred>
        <div className={styles.headerInner}>
          <HomeHeaderInner />
        </div>
      </PullToReloadDeferred>
    </div>
  );
});

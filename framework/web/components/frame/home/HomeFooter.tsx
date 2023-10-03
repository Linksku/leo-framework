import { HomeFooterInner } from 'config/homeComponents';

import styles from './HomeFooterStyles.scss';

export default React.memo(function HomeFooter() {
  return (
    <div className={styles.footer}>
      <div className={styles.footerInner}>
        <HomeFooterInner />
      </div>
    </div>
  );
});

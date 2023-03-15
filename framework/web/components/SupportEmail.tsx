import { SUPPORT_EMAIL } from 'settings';

import styles from './SupportEmailStyles.scss';

export default (
  <Link
    href={`mailto:${SUPPORT_EMAIL}`}
    rel="noopener"
    target="_blank"
    className={styles.link}
  >
    {SUPPORT_EMAIL}
  </Link>
);

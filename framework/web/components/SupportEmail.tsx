import { SUPPORT_EMAIL } from 'config';

import styles from './SupportEmail.scss';

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

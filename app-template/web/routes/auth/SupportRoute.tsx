import RouteInner from 'core/frame/RouteInner';
import SupportEmail from 'components/SupportEmail';
import { BUG_REPORTS_FORM } from 'config';

import styles from './SupportRoute.scss';

export default function SupportRoute() {
  return (
    <RouteInner
      title="Support"
      className={styles.container}
    >
      {'Email us at '}
      {SupportEmail}
      {' or use the '}
      <Link
        href={BUG_REPORTS_FORM}
        rel="noreferrer noopener nofollow"
        target="_blank"
        blue
      >
        bugs reports form
      </Link>
    </RouteInner>
  );
}

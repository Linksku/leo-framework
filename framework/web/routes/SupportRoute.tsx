import StackWrapInner from 'core/frame/stack/StackWrapInner';
import SupportEmail from 'components/SupportEmail';
import { BUG_REPORTS_FORM } from 'config';

import styles from './SupportRoute.scss';

export default function SupportRoute() {
  return (
    <StackWrapInner
      title="Support"
    >
      <div className={styles.container}>
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
      </div>
    </StackWrapInner>
  );
}

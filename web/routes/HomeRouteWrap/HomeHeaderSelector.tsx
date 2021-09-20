import BarsSvg from '@fortawesome/fontawesome-free/svgs/solid/bars.svg';

import { HomeHeaderTitle } from 'config/homeComponents';

import styles from './HomeHeaderSelectorStyles.scss';

export default function HomeHeaderSelector() {
  const { showSidebar } = useUIFrameStore();

  return (
    <div
      className={styles.btn}
      onClick={showSidebar}
      role="button"
      tabIndex={-1}
    >
      <BarsSvg className={styles.menu} />
      <h1 className={styles.title}>
        <HomeHeaderTitle />
      </h1>
    </div>
  );
}

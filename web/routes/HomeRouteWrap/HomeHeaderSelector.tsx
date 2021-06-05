import BarsSvg from '@fortawesome/fontawesome-free/svgs/solid/bars.svg';

import { HomeHeaderTitle } from '../../../src/web/config/homeComponents';

import styles from './HomeHeaderSelectorStyles.scss';

type Props = {
  onClick: React.MouseEventHandler,
};

export default function HomeHeaderSelector({ onClick }: Props) {
  return (
    <div
      className={styles.btn}
      onClick={onClick}
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

import HomeHeader from './HomeHeader';
import HomeSidebar from './HomeSidebar';
import HomeFooter from './HomeFooter';

import styles from './HomeWrapOuterStyles.scss';

export default function HomeWrapOuter() {
  return (
    <div className={styles.container}>
      <HomeHeader />
      <HomeSidebar />
      <HomeFooter />
    </div>
  );
}

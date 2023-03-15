import { PRIMARY_COLOR } from 'consts/ui';

import styles from './SpinnerStyles.scss';

type Props = {
  color?: string,
  dimRem?: number,
  verticalMargin?: number,
  fadeInDuration?: number,
};

const startTime = performance.now();

export default function Spinner({
  color = PRIMARY_COLOR,
  dimRem = 6.4,
  verticalMargin = 5,
  fadeInDuration = 1000,
}: Props) {
  return (
    <div
      className={cx(styles.spinner, {
        [styles.initialLoad]: performance.now() - startTime < 1000,
      })}
      style={{
        borderTopColor: color,
        marginTop: `${verticalMargin}px`,
        marginBottom: `${verticalMargin}px`,
        height: `${dimRem}rem`,
        width: `${dimRem}rem`,
        animationDuration: `${fadeInDuration}ms`,
      }}
    >
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}

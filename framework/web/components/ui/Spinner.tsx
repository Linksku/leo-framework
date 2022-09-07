import styles from './SpinnerStyles.scss';

type Props = {
  color?: string,
  dimRem?: number,
  verticalMargin?: number,
};

const startTime = performance.now();

export default function Spinner({
  color = styles.color,
  dimRem = 6.4,
  verticalMargin = 5,
}: Props) {
  return (
    <div
      className={cn(styles.spinner, {
        [styles.initialLoad]: performance.now() - startTime < 1000,
      })}
      style={{
        borderTopColor: color,
        marginTop: `${verticalMargin}px`,
        marginBottom: `${verticalMargin}px`,
        height: `${dimRem}rem`,
        width: `${dimRem}rem`,
      }}
    >
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}

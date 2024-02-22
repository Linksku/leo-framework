import styles from './Spinner.scss';

type Props = {
  color?: string,
  dimRem?: number,
  verticalMargin?: number,
  fadeInDuration?: number,
};

const startTime = performance.now();

export default function Spinner({
  color,
  dimRem = 6.4,
  verticalMargin = 5,
  fadeInDuration = 1000,
}: Props) {
  const [wasInitial] = useState(performance.now() - startTime < 1000);
  const inner = (
    <div
      style={{
        borderWidth: `${Math.max(0.2, dimRem / 10)}rem`,
      }}
    />
  );
  return (
    <div
      className={cx(styles.spinner, {
        [styles.initialLoad]: wasInitial,
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
      {inner}
      {inner}
      {inner}
      {inner}
    </div>
  );
}

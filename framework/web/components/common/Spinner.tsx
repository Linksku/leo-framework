import styles from './Spinner.scss';

const startTime = performance.now();

export default function Spinner({
  color,
  dimRem = 6,
  verticalMargin = 5,
  animationDelay = 500,
  fadeInDuration = 1000,
}: {
  color?: string,
  dimRem?: number,
  verticalMargin?: number | string,
  animationDelay?: number,
  fadeInDuration?: number,
}) {
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
      style={{
        paddingTop: typeof verticalMargin === 'number' ? `${verticalMargin}px` : verticalMargin,
        paddingBottom: typeof verticalMargin === 'number' ? `${verticalMargin}px` : verticalMargin,
      }}
    >
      <div
        className={cx(styles.spinner, {
          [styles.initialLoad]: wasInitial,
        })}
        style={{
          borderTopColor: color,
          height: `${dimRem}rem`,
          width: `${dimRem}rem`,
          animationDelay: `${animationDelay}ms`,
          animationDuration: `${fadeInDuration}ms`,
        }}
      >
        {inner}
        {inner}
        {inner}
        {inner}
      </div>
    </div>
  );
}

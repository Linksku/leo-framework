import styles from './SpinnerStyles.scss';

type Props = {
  color?: string,
  verticalMargin?: number,
};

export default function Spinner({
  color = styles.color,
  verticalMargin = 5,
}: Props) {
  return (
    <div
      className={styles.spinner}
      style={{
        borderTopColor: color,
        marginTop: `${verticalMargin}px`,
        marginBottom: `${verticalMargin}px`,
      }}
    >
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}

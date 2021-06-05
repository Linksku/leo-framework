import styles from './SpinnerStyles.scss';

type Props = {
  color?: string,
};

export default function Spinner({ color = styles.color }: Props) {
  return (
    <div className={styles.spinner} style={{ borderTopColor: color }}>
      <div />
      <div />
      <div />
      <div />
    </div>
  );
}

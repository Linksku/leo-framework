import styles from './SwitchStyles.scss';

type Props = {
  checked: boolean,
  className?: string,
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function Switch({
  checked,
  className,
  ...props
}: Props) {
  return (
    <label className={cn(styles.wrap, className)}>
      <input
        type="checkbox"
        className={styles.input}
        checked={!!checked}
        {...props}
      />
      <div className={styles.bg} />
      <div className={styles.circle} />
    </label>
  );
}

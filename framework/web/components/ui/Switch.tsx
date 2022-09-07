import styles from './SwitchStyles.scss';

type Props = {
  checked: boolean,
  className?: string,
  label?: string,
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function Switch({
  checked,
  className,
  label,
  ...props
}: Props) {
  return (
    <label className={cn(styles.wrap, className)}>
      <span className={styles.switch}>
        <input
          type="checkbox"
          className={styles.input}
          checked={!!checked}
          {...props}
        />
        <div className={styles.bg} />
        <div className={styles.circle} />
      </span>
      {label && (
        <span className={styles.label}>
          {label}
        </span>
      )}
    </label>
  );
}

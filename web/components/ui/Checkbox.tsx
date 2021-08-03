import styles from './CheckboxStyles.scss';

type Props = {
  checked: boolean,
  onChange: React.ChangeEventHandler<HTMLInputElement>,
  className?: string,
  label?: ReactNode,
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function Checkbox({
  checked,
  onChange,
  className,
  label,
  ...props
}: Props) {
  return (
    <label
      className={cn(className, styles.wrap, {
        [styles.labelWrap]: label,
        [styles.checked]: checked,
      })}
    >
      <span className={styles.checkboxWrap}>
        <svg
          focusable="false"
          viewBox="0 0 24 24"
          aria-hidden="true"
          role="presentation"
        >
          <path
            d={
              checked
                ? 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'
                : 'M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z'
            }
          />
        </svg>
        <input
          type="checkbox"
          className={styles.input}
          checked={!!checked}
          onChange={onChange}
          {...props}
        />
      </span>
      {label
        ? (
          <span className={styles.label}>{label}</span>
        )
        : null}
    </label>
  );
}

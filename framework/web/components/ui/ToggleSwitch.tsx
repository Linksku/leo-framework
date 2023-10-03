import type { UseFormRegister, RegisterOptions, UseFormWatch } from 'react-hook-form';

import styles from './ToggleSwitchStyles.scss';

type Props = {
  name: string,
  checkedLabel?: string,
  uncheckedLabel?: string,
  label?: string,
  register: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  watch: UseFormWatch<any>,
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function ToggleSwitch({
  name,
  checkedLabel,
  uncheckedLabel,
  register,
  registerOpts,
  watch,
  label: _label,
  className,
  ...props
}: Props) {
  const checked = watch(name);
  const label = _label ?? (checked ? checkedLabel : uncheckedLabel);

  return (
    <label className={cx(styles.wrap, className)}>
      <span className={styles.switch}>
        <input
          {...register(name, registerOpts)}
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

import type { UseFormRegister, RegisterOptions, Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';

import styles from './ToggleSwitch.scss';

type Props = {
  checkedLabel?: string,
  uncheckedLabel?: string,
  label?: string,
  labelOnLeft?: boolean,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  control?: Control<any>,
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function ToggleSwitch({
  checked: _checked,
  checkedLabel,
  uncheckedLabel,
  name,
  register,
  registerOpts,
  control,
  label: _label,
  labelOnLeft,
  disabled,
  className,
  onChange,
  ...props
}: Props) {
  if (!process.env.PRODUCTION) {
    if (register && props.required && !registerOpts?.required) {
      throw new Error('ToggleSwitch: use registerOpts.required');
    }
    if ((register || control) && (!register || !control || !name)) {
      throw new Error('ToggleSwitch: missing props');
    }
  }

  const checked = name && control
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useWatch({ name, control })
    : _checked;
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;

  const label = _label ?? (checked ? checkedLabel : uncheckedLabel);
  return (
    <label
      className={cx(styles.wrap, className, {
        [styles.disabled]: disabled,
      })}
    >
      {label && labelOnLeft && (
        <span className={cx(styles.label, styles.labelOnLeft)}>
          {label}
        </span>
      )}
      <span className={styles.switch}>
        <input
          {...registerProps}
          type="checkbox"
          className={styles.input}
          checked={!!checked}
          readOnly={disabled}
          onChange={e => {
            if (registerProps) {
              wrapPromise(registerProps.onChange(e), 'warn', 'ToggleSwitch');
            }
            onChange?.(e);
          }}
          {...props}
        />
        <div className={styles.bg} />
        <div className={styles.circle} />
      </span>
      {label && !labelOnLeft && (
        <span className={styles.label}>
          {label}
        </span>
      )}
    </label>
  );
}

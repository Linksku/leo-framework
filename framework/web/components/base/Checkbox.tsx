import type { UseFormRegister, RegisterOptions, UseFormWatch } from 'react-hook-form';

import styles from './Checkbox.scss';

type Props = {
  checked?: boolean,
  label?: ReactNode,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  watch?: UseFormWatch<any>,
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function Checkbox({
  checked: _checked,
  disabled,
  className,
  label,
  name,
  register,
  registerOpts,
  watch,
  ...props
}: Props) {
  if (!process.env.PRODUCTION && register && props.required && !registerOpts?.required) {
    throw new Error('Checkbox: use registerOpts.required');
  }

  const checked = name && watch
    ? watch(name)
    : _checked;
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;

  return (
    <label
      className={cx(styles.wrap, className, {
        [styles.labelWrap]: label,
        [styles.checked]: checked,
        [styles.disabled]: disabled,
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
          {...registerProps}
          type="checkbox"
          className={styles.input}
          checked={checked}
          disabled={disabled}
          {...props}
          required={props.required ?? !!registerOpts?.required}
        />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}

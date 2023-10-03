import type { UseFormRegister, RegisterOptions, UseFormWatch } from 'react-hook-form';

import styles from './RadioStyles.scss';

type Props = {
  checked?: boolean,
  label?: ReactNode,
  showRadio?: boolean,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  watch?: UseFormWatch<any>,
} & React.InputHTMLAttributes<HTMLInputElement>;

export default function Radio({
  checked: _checked,
  showRadio = true,
  label,
  value,
  className,
  name,
  register,
  registerOpts,
  watch,
  ...props
}: Props) {
  if (!process.env.PRODUCTION && register && props.required && !registerOpts?.required) {
    throw new Error('Radio: use registerOpts.required');
  }

  const checked = name && watch
    ? watch(name) === value
    : _checked;
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;

  return (
    <label
      className={cx(className, styles.wrap, {
        [styles.labelWrap]: label,
        [styles.checked]: checked,
        [styles.radioShown]: showRadio,
      })}
    >
      <span className={styles.radioWrap}>
        {showRadio && (
          <>
            <svg
              focusable="false"
              viewBox="0 0 24 24"
              aria-hidden="true"
              role="presentation"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
            </svg>
            <svg
              focusable="false"
              viewBox="0 0 24 24"
              aria-hidden="true"
              role="presentation"
              className={styles.svgInner}
            >
              <path d="M8.465 8.465C9.37 7.56 10.62 7 12 7C14.76 7 17 9.24 17 12C17 13.38 16.44 14.63 15.535 15.535C14.63 16.44 13.38 17 12 17C9.24 17 7 14.76 7 12C7 10.62 7.56 9.37 8.465 8.465Z" />
            </svg>
          </>
        )}
        <input
          {...registerProps}
          type="radio"
          className={styles.input}
          checked={checked}
          value={value}
          {...props}
          required={props.required ?? !!registerOpts?.required}
        />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}

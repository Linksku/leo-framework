import type { UseFormRegister, RegisterOptions, Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import CheckedSvg from 'svgs/fa5/check-square-solid.svg';
import UncheckedSvg from 'svgs/fa5/square-regular.svg';

import styles from './Checkbox.scss';

type Props = {
  checked?: boolean,
  label?: ReactNode,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  control?: Control<any>,
  overrides?: Pick<
    React.CSSProperties,
    | 'marginBottom'
  >,
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'readOnly'>;

export default function Checkbox({
  checked: _checked,
  disabled,
  className,
  label,
  name,
  register,
  registerOpts,
  control,
  onChange,
  overrides,
  ...props
}: Props) {
  if (!process.env.PRODUCTION) {
    if (register && props.required && !registerOpts?.required) {
      throw new Error('Checkbox: use registerOpts.required');
    }
    if ((register || control) && (!register || !control || !name)) {
      throw new Error('Checkbox: missing props');
    }
  }

  const checked = name && control
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useWatch({ name, control })
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
      style={{
        marginBottom: overrides?.marginBottom,
      }}
    >
      <span className={styles.checkboxWrap}>
        {checked ? <CheckedSvg /> : <UncheckedSvg />}
        <input
          {...registerProps}
          type="checkbox"
          className={styles.input}
          checked={checked}
          readOnly={disabled}
          onChange={e => {
            if (registerProps) {
              wrapPromise(registerProps.onChange(e), 'warn', 'Checkbox');
            }
            onChange?.(e);
          }}
          {...props}
          required={props.required ?? !!registerOpts?.required}
        />
      </span>
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
}

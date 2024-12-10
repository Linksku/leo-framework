import type { UseFormRegister, RegisterOptions, Control } from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import CheckSvg from 'svgs/fa5/check-regular.svg';
import PlusSvg from 'svgs/fa5/plus-regular.svg';

import styles from './ToggleButton.scss';

type Props = {
  checked?: boolean,
  checkedLabel?: string,
  uncheckedLabel?: string,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  control?: Control<any>,
  onChange?: React.ChangeEventHandler<HTMLInputElement>,
} & Omit<Parameters<typeof Button>[0], 'onChange'>;

export default function ToggleButton({
  checked: _checked,
  disabled,
  checkedLabel,
  uncheckedLabel,
  name,
  register,
  registerOpts,
  control,
  label,
  onChange,
  ...props
}: Props) {
  if (!process.env.PRODUCTION) {
    if (register && props.required && !registerOpts?.required) {
      throw new Error('ToggleButton: use registerOpts.required');
    }
    if ((register || control) && (!register || !control || !name)) {
      throw new Error('ToggleButton: missing props');
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
    <div className={styles.container}>
      <input
        {...registerProps}
        type="checkbox"
        checked={checked}
        readOnly={disabled}
        className={cx(styles.checkbox, {
          [styles.disabled]: disabled,
        })}
        onChange={e => {
          if (!disabled) {
            if (registerProps) {
              wrapPromise(registerProps.onChange(e), 'warn', 'ToggleButton');
            }
            onChange?.(e);
          }
        }}
      />
      <Button
        LeftSvg={checked ? CheckSvg : PlusSvg}
        label={label ?? (checked ? checkedLabel : uncheckedLabel)}
        outline={!checked}
        disabled={disabled}
        {...props}
        overrides={{
          ...props.overrides,
          color: checked
            ? undefined
            : (disabled ? '#aaa' : '#888'),
          borderColor: checked
            ? undefined
            : (disabled ? '#ddd' : '#ccc'),
        }}
      />
    </div>
  );
}

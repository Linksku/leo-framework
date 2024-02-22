import type { UseFormRegister, RegisterOptions, UseFormWatch } from 'react-hook-form';
import CheckSvg from 'svgs/fa5/check-regular.svg';
import PlusSvg from 'svgs/fa5/plus-regular.svg';

import styles from './ToggleButton.scss';

type Props = {
  name: string,
  checkedLabel?: string,
  uncheckedLabel?: string,
  register: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  watch: UseFormWatch<any>,
} & Parameters<typeof Button>[0];

export default function ToggleButton({
  name,
  disabled,
  checkedLabel,
  uncheckedLabel,
  register,
  registerOpts,
  watch,
  label,
  ...props
}: Props) {
  const checked = watch(name);

  return (
    <div className={styles.container}>
      <input
        {...register(name, registerOpts)}
        type="checkbox"
        disabled={disabled}
        className={styles.checkbox}
      />
      <Button
        LeftSvg={checked ? CheckSvg : PlusSvg}
        label={label ?? (checked ? checkedLabel : uncheckedLabel)}
        outline={!checked}
        disabled={disabled}
        {...props}
        overrides={{
          ...props.overrides,
          color: checked ? undefined : '#888',
          borderColor: checked ? undefined : '#ccc',
        }}
      />
    </div>
  );
}

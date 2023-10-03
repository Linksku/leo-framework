import type { UseFormRegister, RegisterOptions, UseFormWatch } from 'react-hook-form';
import CheckSvg from 'fa5/svg/check-regular.svg';
import PlusSvg from 'fa5/svg/plus-regular.svg';

import styles from './ToggleButtonStyles.scss';

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
        className={styles.checkbox}
      />
      <Button
        LeftSvg={checked ? CheckSvg : PlusSvg}
        label={label ?? (checked ? checkedLabel : uncheckedLabel)}
        outline={!checked}
        color={checked ? undefined : '#888'}
        borderColor={checked ? undefined : '#ccc'}
        {...props}
      />
    </div>
  );
}

import type { UseFormRegister, RegisterOptions } from 'react-hook-form';

import styles from './InputStyles.scss';

type Props = {
  className?: string,
  label?: ReactNode,
  prefix?: ReactNode,
  suffix?: ReactNode,
  error?: boolean,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
} & React.InputHTMLAttributes<HTMLInputElement>;

function Input({
  children: _,
  className,
  label,
  prefix,
  suffix,
  error,
  name,
  register,
  registerOpts,
  onChange,
  onBlur,
  ...props
}: React.PropsWithChildren<Props>, ref?: React.ForwardedRef<HTMLInputElement>) {
  const WrapperComponent = (label || prefix || suffix)
    ? 'label'
    : 'span';
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;
  return (
    <WrapperComponent
      className={cn(styles.inputGroup, className, {
        [styles.labelWrap]: label,
      })}
    >
      {label
        ? (
          <span className={styles.label}>{label}</span>
        )
        : null}
      {prefix
        ? (
          <span className={styles.prefix}>{prefix}</span>
        )
        : null}
      {suffix
        ? (
          <span className={styles.suffix}>{suffix}</span>
        )
        : null}
      <span className={styles.inputWrap}>
        <input
          {...registerProps}
          className={cn(styles.input, {
            [styles.error]: error,
            [styles.hasPrefix]: prefix,
            [styles.hasSuffix]: suffix,
          })}
          ref={elem => {
            if (typeof ref === 'function') {
              ref(elem);
            } else if (ref) {
              (ref.current as HTMLInputElement | null) = elem;
            }

            if (registerProps) {
              registerProps.ref(elem);
            }
          }}
          onChange={e => {
            onChange?.(e);
            registerProps?.onChange(e);
          }}
          onBlur={e => {
            onBlur?.(e);
            registerProps?.onBlur(e);
          }}
          {...props}
        />
      </span>
    </WrapperComponent>
  );
}

export default React.forwardRef(Input);

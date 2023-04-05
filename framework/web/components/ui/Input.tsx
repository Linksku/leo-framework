import type { UseFormRegister, RegisterOptions } from 'react-hook-form';

import styles from './InputStyles.scss';

type Props = {
  className?: string,
  label?: ReactNode,
  labelProps?: React.HTMLAttributes<HTMLLabelElement>,
  prefix?: ReactNode,
  prefixProps?: React.HTMLAttributes<HTMLSpanElement>,
  suffix?: ReactNode,
  suffixProps?: React.HTMLAttributes<HTMLSpanElement>,
  error?: boolean,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
} & React.InputHTMLAttributes<HTMLInputElement>;

function Input({
  children: _,
  className,
  label,
  labelProps,
  prefix,
  prefixProps,
  suffix,
  suffixProps,
  error,
  name,
  register,
  registerOpts,
  onChange,
  onBlur,
  ...props
}: React.PropsWithChildren<Props>, ref?: React.ForwardedRef<HTMLInputElement>) {
  if (!process.env.PRODUCTION && props.disabled && onBlur) {
    // https://github.com/facebook/react/issues/9142
    ErrorLogger.warn(new Error('Input: React won\'t trigger onBlur when disabled'));
  }

  const WrapperComponent = (label || prefix || suffix)
    ? 'label'
    : 'span';
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;
  return (
    <WrapperComponent
      className={cx(styles.inputGroup, className, {
        [styles.labelWrap]: label,
      })}
    >
      {label && <span {...labelProps} className={styles.label}>{label}</span>}
      {prefix && <span {...prefixProps} className={styles.prefix}>{prefix}</span>}
      {suffix && <span {...suffixProps} className={styles.suffix}>{suffix}</span>}
      <span className={styles.inputWrap}>
        <input
          {...registerProps}
          className={cx(styles.input, {
            [styles.error]: error,
            [styles.hasPrefix]: prefix,
            [styles.hasSuffix]: suffix,
          })}
          ref={elem => {
            if (typeof ref === 'function') {
              ref(elem);
            } else if (ref) {
              ref.current = elem;
            }

            if (registerProps) {
              registerProps.ref(elem);
            }
          }}
          onChange={e => {
            onChange?.(e);
            if (registerProps) {
              wrapPromise(registerProps.onChange(e), 'warn', 'Input.onChange');
            }
          }}
          onBlur={e => {
            onBlur?.(e);
            if (registerProps) {
              wrapPromise(registerProps.onBlur(e), 'warn', 'Input.onBlur');
            }
          }}
          {...props}
        />
      </span>
    </WrapperComponent>
  );
}

export default React.forwardRef(Input);

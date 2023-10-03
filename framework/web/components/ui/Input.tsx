import type { UseFormRegister, RegisterOptions } from 'react-hook-form';

import useAutoFocusOnEnterRoute from 'hooks/useAutoFocusOnEnterRoute';
import mergeRefs from 'utils/mergeRefs';
import FormError from 'components/FormError';

import styles from './InputStyles.scss';

type Props = {
  label?: ReactNode,
  labelProps?: React.HTMLAttributes<HTMLLabelElement>,
  prefix?: ReactNode,
  prefixProps?: React.HTMLAttributes<HTMLSpanElement>,
  suffix?: ReactNode,
  suffixProps?: React.HTMLAttributes<HTMLSpanElement>,
  error?: Nullish<string> | boolean,
  marginBottom?: string | number,
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
  marginBottom,
  register,
  registerOpts,
  onChange,
  onBlur,
  autoFocus,
  ...props
}: React.PropsWithChildren<Props>, ref?: React.ForwardedRef<HTMLInputElement>) {
  if (!process.env.PRODUCTION) {
    if (props.disabled && onBlur) {
      // https://github.com/facebook/react/issues/9142
      ErrorLogger.warn(new Error('Input: React won\'t trigger onBlur when disabled'));
    }
    if (register && props.required && !registerOpts?.required) {
      throw new Error('Input: use registerOpts.required');
    }
  }

  const autoFocusRef = typeof autoFocus === 'boolean'
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useAutoFocusOnEnterRoute(autoFocus)
    : null;
  // todo: low/mid make empty space in label not focus input
  const WrapperComponent = (label || prefix || suffix)
    ? 'label'
    : 'span';
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;

  const inputGroup = (
    <WrapperComponent
      className={cx(styles.inputGroup, className, {
        [styles.labelWrap]: label,
        [styles.hasError]: !!error,
      })}
      style={{
        marginBottom: error ? 0 : marginBottom,
      }}
    >
      {label && <span {...labelProps} className={styles.label}>{label}</span>}
      <input
        {...registerProps}
        className={cx(styles.input, {
          [styles.hasPrefix]: prefix,
          [styles.hasSuffix]: suffix,
        })}
        ref={mergeRefs(
          ref,
          registerProps?.ref,
          autoFocusRef,
        )}
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
        required={props.required ?? !!registerOpts?.required}
      />
      {prefix && <span {...prefixProps} className={styles.prefix}>{prefix}</span>}
      {suffix && <span {...suffixProps} className={styles.suffix}>{suffix}</span>}
    </WrapperComponent>
  );
  return error && typeof error === 'string'
    ? (
      <>
        {inputGroup}
        <div className={styles.error}>
          <FormError
            error={error}
            marginBottom={marginBottom}
          />
        </div>
      </>
    )
    : inputGroup;
}

export default React.forwardRef(Input);

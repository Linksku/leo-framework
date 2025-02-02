import type { UseFormRegister, RegisterOptions } from 'react-hook-form';

import useAutoFocusOnEnterRoute from 'core/useAutoFocusOnEnterRoute';
import mergeRefs from 'utils/mergeRefs';
import FormError from 'components/form/FormError';
import detectPlatform from 'utils/detectPlatform';

import styles from './Input.scss';

type Props = {
  label?: ReactNode,
  labelProps?: React.HTMLAttributes<HTMLLabelElement>,
  PrefixSvg?: SVGFactory | null,
  prefix?: ReactNode,
  prefixClassName?: string,
  prefixProps?: React.HTMLAttributes<HTMLSpanElement>,
  SuffixSvg?: SVGFactory | null,
  suffix?: ReactNode,
  suffixClassName?: string,
  suffixProps?: React.HTMLAttributes<HTMLSpanElement>,
  error?: Nullish<string> | boolean,
  borderless?: boolean,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  overrides?: Pick<
    React.CSSProperties,
    | 'borderColor'
    | 'marginBottom'
  >,
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix' | 'readOnly'>;

function Input({
  children: _,
  className,
  label,
  labelProps,
  PrefixSvg,
  prefix,
  prefixClassName,
  prefixProps,
  SuffixSvg,
  suffix,
  suffixClassName,
  suffixProps,
  error,
  name,
  borderless,
  register,
  registerOpts,
  overrides,
  onChange,
  onBlur,
  autoFocus,
  disabled,
  required,
  ...props
}: React.PropsWithChildren<Props>, ref?: React.ForwardedRef<HTMLInputElement>) {
  if (!process.env.PRODUCTION) {
    if (disabled && onBlur) {
      // https://github.com/facebook/react/issues/9142
      ErrorLogger.warn(new Error('Input: React won\'t trigger onBlur when disabled'));
    }
    if (register && required && !registerOpts?.required) {
      throw new Error('Input: use registerOpts.required');
    }
  }

  const autoFocusRef = typeof autoFocus === 'boolean'
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useAutoFocusOnEnterRoute(autoFocus)
    : null;
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;

  if (PrefixSvg) {
    prefix = <PrefixSvg className={cx(styles.prefixSvg, prefixClassName)} />;
  }
  if (SuffixSvg) {
    suffix = <SuffixSvg className={cx(styles.suffixSvg, suffixClassName)} />;
  }
  // todo: low/mid make empty space in label not focus input
  const WrapperComponent = (label || prefix || suffix)
    ? 'label'
    : 'span';
  const initialWrapperComponent = useRef(WrapperComponent);
  if (!process.env.PRODUCTION && WrapperComponent !== initialWrapperComponent.current) {
    ErrorLogger.warn(new Error('Input: WrapperComponent changed'));
  }

  const inputGroup = (
    <WrapperComponent
      className={cx(styles.inputGroup, className, {
        [styles.labelWrap]: label,
        [styles.disabled]: disabled,
        [styles.hasError]: !!error,
        [styles.borderless]: borderless,
      })}
      style={{
        marginBottom: error ? 0 : overrides?.marginBottom,
      }}
    >
      {label && <span {...labelProps} className={styles.label}>{label}</span>}
      <input
        {...registerProps}
        ref={mergeRefs(
          ref,
          registerProps?.ref,
          autoFocusRef,
        )}
        // Prefer readOnly over disabled
        readOnly={disabled}
        className={cx(styles.input, {
          [styles.hasPrefix]: prefix,
          [styles.hasSuffix]: suffix,
        })}
        style={{
          borderColor: overrides?.borderColor,
        }}
        onChange={e => {
          if (registerProps) {
            wrapPromise(registerProps.onChange(e), 'warn', 'Input.onChange');
          }
          onChange?.(e);
        }}
        onBlur={e => {
          if (registerProps) {
            wrapPromise(registerProps.onBlur(e), 'warn', 'Input.onBlur');
          }
          onBlur?.(e);
        }}
        {...props}
        required={required ?? !!registerOpts?.required}
      />
      {prefix && (
        <span
          {...prefixProps}
          className={styles.prefix}
          style={{
            borderColor: overrides?.borderColor,
          }}
        >
          {prefix}
        </span>
      )}
      {suffix && (
        <span
          {...suffixProps}
          className={styles.suffix}
          style={{
            borderColor: overrides?.borderColor,
            // Fix for right border cut off on Android
            marginRight: detectPlatform().os === 'android' ? '1px' : undefined,
          }}
        >
          {suffix}
        </span>
      )}
    </WrapperComponent>
  );
  return error && typeof error === 'string'
    ? (
      <>
        {inputGroup}
        <div className={styles.error}>
          <FormError
            error={error}
            marginBottom={overrides?.marginBottom}
          />
        </div>
      </>
    )
    : inputGroup;
}

export default React.forwardRef(Input);

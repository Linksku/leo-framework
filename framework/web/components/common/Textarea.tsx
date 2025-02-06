import type { UseFormRegister, RegisterOptions } from 'react-hook-form';

import mergeRefs from 'utils/mergeRefs';
import useAutoFocusOnEnterRoute from 'core/useAutoFocusOnEnterRoute';

import FormError from 'components/form/FormError';
import styles from './Textarea.scss';

type Props = {
  ref?: React.Ref<HTMLTextAreaElement>,
  className?: string,
  textareaClassName?: string,
  label?: ReactNode,
  name?: string,
  error?: Nullish<string> | boolean,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  overrides?: Pick<
    React.CSSProperties,
    | 'marginBottom'
    | 'padding'
    | 'paddingBottom'
    | 'paddingLeft'
    | 'paddingRight'
    | 'paddingTop'
  >,
  disabled?: boolean,
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export default function Textarea({
  ref,
  children,
  className,
  textareaClassName,
  label,
  name,
  error,
  register,
  registerOpts,
  overrides,
  autoFocus,
  ...props
}: Props) {
  if (!process.env.PRODUCTION && register && props.required && !registerOpts?.required) {
    throw new Error('Textarea: use registerOpts.required');
  }

  const autoFocusRef = typeof autoFocus === 'boolean'
    // eslint-disable-next-line react-hooks/rules-of-hooks
    ? useAutoFocusOnEnterRoute(autoFocus)
    : null;
  const WrapperComponent = label ? 'label' : 'span';
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;
  const textarea = (
    <WrapperComponent
      className={cx(styles.inputWrap, {
        [styles.labelWrap]: label,
        [styles.hasError]: !!error,
      }, className)}
      style={{
        marginBottom: error ? 0 : overrides?.marginBottom,
      }}
    >
      {label && <span className={styles.label}>{label}</span>}
      <textarea
        {...registerProps}
        ref={mergeRefs(
          ref,
          registerProps?.ref,
          autoFocus ? autoFocusRef : null,
        )}
        className={cx(styles.textarea, textareaClassName)}
        // Default is "sentences" in Chrome/Safari, but not FF
        autoCapitalize="sentences"
        {...props}
        required={props.required ?? !!registerOpts?.required}
      >
        {children}
      </textarea>
    </WrapperComponent>
  );
  return error && typeof error === 'string'
    ? (
      <>
        {textarea}
        <div className={styles.error}>
          <FormError
            error={error}
            marginBottom={overrides?.marginBottom}
          />
        </div>
      </>
    )
    : textarea;
}

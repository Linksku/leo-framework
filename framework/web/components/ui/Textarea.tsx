import type { UseFormRegister, RegisterOptions } from 'react-hook-form';

import mergeRefs from 'utils/mergeRefs';
import useAutoFocusOnEnterRoute from 'hooks/useAutoFocusOnEnterRoute';

import styles from './TextareaStyles.scss';

type Props = {
  className?: string,
  textareaClassName?: string,
  label?: ReactNode,
  name?: string,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  disabled?: boolean,
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function Textarea({
  children,
  className,
  textareaClassName,
  label,
  name,
  register,
  registerOpts,
  autoFocus,
  ...props
}: Props, ref?: React.ForwardedRef<HTMLTextAreaElement>) {
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
  return (
    <WrapperComponent
      className={cx(styles.inputWrap, {
        [styles.labelWrap]: label,
      }, className)}
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
        {...props}
        required={props.required ?? !!registerOpts?.required}
      >
        {children}
      </textarea>
    </WrapperComponent>
  );
}

export default React.forwardRef(Textarea);

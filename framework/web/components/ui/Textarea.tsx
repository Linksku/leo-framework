import type { UseFormRegister, RegisterOptions } from 'react-hook-form';

import mergeRefs from 'utils/mergeRefs';

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
  ...props
}: Props, ref?: React.ForwardedRef<HTMLTextAreaElement>) {
  const WrapperComponent = label ? 'label' : 'span';
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;
  return (
    <WrapperComponent
      className={cn(styles.inputWrap, {
        [styles.labelWrap]: label,
      }, className)}
    >
      {label
        ? (
          <span className={styles.label}>{label}</span>
        )
        : null}
      <textarea
        {...registerProps}
        ref={mergeRefs(ref, registerProps?.ref)}
        className={cn(styles.textarea, textareaClassName)}
        {...props}
      >
        {children}
      </textarea>
    </WrapperComponent>
  );
}

export default React.forwardRef(Textarea);

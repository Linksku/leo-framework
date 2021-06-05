import type { UseFormRegister, RegisterOptions } from 'react-hook-form';

import mergeRefs from 'lib/mergeRefs';

import styles from './TextareaStyles.scss';

type Props = {
  className?: string,
  label?: ReactNode,
  name?: string,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>;

function Textarea({
  children,
  className,
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
      className={cn(className, styles.inputWrap, {
        [styles.labelWrap]: label,
      })}
    >
      {label
        ? (
          <span className={styles.label}>{label}</span>
        )
        : null}
      <textarea
        {...registerProps}
        ref={mergeRefs(ref, registerProps?.ref)}
        className={styles.textarea}
        {...props}
      >
        {children}
      </textarea>
    </WrapperComponent>
  );
}

export default React.forwardRef(Textarea);

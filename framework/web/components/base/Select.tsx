import type { UseFormRegister, RegisterOptions } from 'react-hook-form';

import styles from './Select.scss';

type Props<T extends string> = {
  options: Stable<{ key: T, label: string }[]>,
  defaultKey?: T,
  label?: ReactNode,
  placeholder?: string,
  renderClickable?: (key?: T, label?: string) => ReactElement,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
} & React.SelectHTMLAttributes<HTMLSelectElement>;

function Select<T extends string>({
  className,
  options,
  defaultKey,
  placeholder,
  label,
  renderClickable,
  onChange,
  name,
  disabled,
  register,
  registerOpts,
  ...props
}: Props<T>, ref?: React.ForwardedRef<HTMLSelectElement>) {
  if (!process.env.PRODUCTION && register && props.required && !registerOpts?.required) {
    throw new Error('Select: use registerOpts.required');
  }

  const [selectedValue, setSelectedValue] = useState<T | undefined>(defaultKey);
  const selectedName = useMemo(
    () => options.find(o => o.key === selectedValue)?.label,
    [selectedValue, options],
  );
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;

  const select = (
    <select
      ref={ref}
      className={cx(
        styles.select,
        {
          [styles.placeholder]: placeholder != null && !selectedValue,
          [styles.withClickable]: renderClickable,
        },
      )}
      value={selectedValue ?? undefined}
      {...registerProps}
      disabled={disabled}
      onChange={event => {
        setSelectedValue(event.target.value as T);
        onChange?.(event);
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        registerProps?.onChange(event);
      }}
      {...props}
      required={props.required ?? !!registerOpts?.required}
    >
      {placeholder != null && <option key="" hidden>{placeholder}</option>}
      {options.map(opt => (
        <option key={opt.key} value={opt.key}>{opt.label}</option>
      ))}
    </select>
  );

  return (
    <label
      className={cx(styles.wrap, className, {
        [styles.withLabel]: !!label,
      })}
      style={{
        pointerEvents: disabled ? 'none' : undefined,
      }}
    >
      {label && <span className={styles.label}>{label}</span>}
      {select}
      {renderClickable?.(selectedValue as T, selectedName)}
    </label>
  );
}

export default React.forwardRef(Select) as typeof Select;

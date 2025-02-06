import type { UseFormRegister, RegisterOptions } from 'react-hook-form';

import styles from './Select.scss';

type Props<T extends string> = {
  ref?: React.Ref<HTMLSelectElement>,
  options: Stable<{ key: T, label: string }[]>,
  value?: T,
  defaultValue?: T,
  label?: ReactNode,
  placeholder?: string,
  renderClickable?: (key?: T, label?: string) => ReactElement,
  register?: UseFormRegister<any>,
  registerOpts?: RegisterOptions<any>,
  overrides?: Pick<
    React.CSSProperties,
    'display'
  >
} & React.SelectHTMLAttributes<HTMLSelectElement>;

export default function Select<T extends string>({
  ref,
  className,
  options,
  value,
  defaultValue,
  placeholder,
  label,
  renderClickable,
  onChange,
  name,
  disabled,
  register,
  registerOpts,
  overrides,
  ...props
}: Props<T>) {
  if (!process.env.PRODUCTION && register && props.required && !registerOpts?.required) {
    throw new Error('Select: use registerOpts.required');
  }

  const [_selectedValue, setSelectedValue] = useState<T | undefined>(value ?? defaultValue);
  const selectedValue = value ?? _selectedValue;
  const selectedName = useMemo(
    () => options.find(o => o.key === selectedValue)?.label,
    [selectedValue, options],
  );
  const registerProps = register && name
    ? register(name, registerOpts)
    : null;
  const selectId = useId();

  const select = (
    <select
      ref={ref}
      id={selectId}
      className={cx(
        styles.select,
        {
          [styles.placeholder]: placeholder != null && !selectedValue,
          [styles.disabled]: disabled,
          [styles.withClickable]: renderClickable,
        },
      )}
      value={register ? undefined : selectedValue}
      {...registerProps}
      disabled={disabled}
      onChange={e => {
        setSelectedValue(e.target.value as T);

        if (registerProps) {
          wrapPromise(registerProps.onChange(e), 'warn', 'Select.onChange');
        }
        onChange?.(e);
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
      htmlFor={selectId}
      className={cx(styles.wrap, className, {
        [styles.withLabel]: !!label,
      })}
      style={{
        pointerEvents: disabled ? 'none' : undefined,
        ...overrides,
      }}
    >
      {label && <span className={styles.label}>{label}</span>}
      {select}
      {renderClickable?.(selectedValue as T, selectedName)}
    </label>
  );
}

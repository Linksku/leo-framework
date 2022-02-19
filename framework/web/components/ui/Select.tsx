import styles from './SelectStyles.scss';

type Props<T extends string> = {
  className?: string,
  options: Memoed<{ key: T, name: string }[]>,
  defaultKey?: T,
  placeholder?: string,
  label?: ReactNode,
  renderClickable?: (key?: T, name?: string) => ReactElement,
  onChange?: React.ChangeEventHandler<HTMLSelectElement>,
} & React.SelectHTMLAttributes<HTMLSelectElement>;

function Select<T extends string>({
  className,
  options,
  defaultKey,
  placeholder,
  label,
  renderClickable,
  onChange,
  ...props
}: Props<T>, ref?: React.ForwardedRef<HTMLSelectElement>) {
  const [selectedValue, setSelectedValue] = useState<T | undefined>(defaultKey);
  const selectedName = useMemo(
    () => options.find(o => o.key === selectedValue)?.name,
    [selectedValue, options],
  );

  const select = (
    <select
      ref={ref}
      className={cn(
        styles.select,
        {
          [styles.placeholder]: placeholder && !selectedValue,
          [styles.withClickable]: renderClickable,
        },
      )}
      value={selectedValue ?? undefined}
      onChange={event => {
        setSelectedValue(event.target.value as T);
        onChange?.(event);
      }}
      {...props}
    >
      {placeholder
        ? <option key="" hidden>{placeholder}</option>
        : null}
      {options.map(opt => (
        <option key={opt.key} value={opt.key}>{opt.name}</option>
      ))}
    </select>
  );

  return (
    <label
      className={cn(styles.wrap, className, {
        [styles.withLabel]: !!label,
      })}
    >
      {label ? <span className={styles.label}>{label}</span> : null}
      {renderClickable?.(selectedValue, selectedName)}
      {select}
    </label>
  );
}

export default React.forwardRef(Select) as typeof Select;

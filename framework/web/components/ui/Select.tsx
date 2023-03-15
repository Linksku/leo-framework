import styles from './SelectStyles.scss';

type Props<T extends string> = {
  className?: string,
  options: Memoed<{ key: T, label: string }[]>,
  defaultKey?: T,
  placeholder?: string,
  label?: ReactNode,
  renderClickable?: (key?: T, label?: string) => ReactElement,
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
    () => options.find(o => o.key === selectedValue)?.label,
    [selectedValue, options],
  );

  const select = (
    <select
      ref={ref}
      className={cx(
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
      {placeholder && <option key="" hidden>{placeholder}</option>}
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
    >
      {select}
      {label && <span className={styles.label}>{label}</span>}
      {renderClickable?.(selectedValue, selectedName)}
    </label>
  );
}

export default React.forwardRef(Select) as typeof Select;

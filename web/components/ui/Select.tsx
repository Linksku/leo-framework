import styles from './SelectStyles.scss';

type Props = {
  className?: string,
  options: Memoed<{ key: string, name: string }[]>,
  defaultValue?: string,
  placeholder?: string,
  label?: ReactNode,
  renderClickable?: (key?: string, name?: string) => ReactElement,
  onChange?: React.ChangeEventHandler<HTMLSelectElement>,
} & React.SelectHTMLAttributes<HTMLSelectElement>;

function Select({
  className,
  options,
  defaultValue,
  placeholder,
  label,
  renderClickable,
  onChange,
  ...props
}: Props, ref?: React.ForwardedRef<HTMLSelectElement>) {
  const [selectedValue, setSelectedValue] = useState(defaultValue);
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
        setSelectedValue(event.target.value);
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

export default React.forwardRef(Select);

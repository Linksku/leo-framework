import styles from './DropdownStyles.scss';

type Props = MemoObjShallow<{
  options: { key: string, name: string }[],
  defaultElement?: ReactElement,
  open: boolean,
  className?: string,
  defaultValue?: string,
  onOptionMouseDown?: (event: React.MouseEvent, key: string, name: string) => void,
}> & React.HTMLAttributes<HTMLDivElement>;

export default function Dropdown({
  options,
  defaultElement,
  open,
  className,
  onOptionMouseDown,
  ...props
}: Props) {
  if (!open) {
    return null;
  }

  return (
    <div className={cn(styles.dropdown, className)} {...props}>
      <div className={styles.dropdownInner}>
        {options.length
          ? options.map(({ key, name }) => (
            <div
              key={key}
              onMouseDown={event => onOptionMouseDown?.(event, key, name)}
              role="button"
              tabIndex={-1}
              className={styles.option}
            >
              {name}
            </div>
          ))
          : (
            <div className={styles.option}>
              {defaultElement}
            </div>
          )}
      </div>
    </div>
  );
}

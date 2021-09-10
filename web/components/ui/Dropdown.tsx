import styles from './DropdownStyles.scss';

type Props = MemoObjShallow<{
  options: { key: string | null, name: string }[],
  defaultElement?: ReactElement,
  lastElement?: ReactElement,
  open: boolean,
  className?: string,
  defaultValue?: string,
  onOptionMouseDown?: (event: React.MouseEvent, key: string | null, name: string) => void,
}> & React.HTMLAttributes<HTMLDivElement>;

export default function Dropdown({
  options,
  defaultElement,
  lastElement,
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

        {lastElement
          ? (
            <div className={styles.option}>
              {lastElement}
            </div>
          )
          : null}
      </div>
    </div>
  );
}

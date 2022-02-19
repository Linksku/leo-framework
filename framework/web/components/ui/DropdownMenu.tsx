import styles from './DropdownMenuStyles.scss';

export type Props = {
  options: { key: string | null, name: string }[],
  defaultElement?: ReactNode,
  onDefaultElementMouseDown?: React.MouseEventHandler,
  lastElement?: ReactNode,
  onLastElementMouseDown?: React.MouseEventHandler,
  open: boolean,
  className?: string,
  defaultValue?: string,
  onOptionMouseDown?: (event: React.MouseEvent, key: string | null, name: string) => void,
} & React.HTMLAttributes<HTMLDivElement>;

// Used with Typeahead and Dropdown.
export default function DropdownMenu({
  options,
  defaultElement,
  onDefaultElementMouseDown,
  lastElement,
  onLastElementMouseDown,
  open,
  className,
  onOptionMouseDown,
  ...props
}: Props) {
  if (!open || (!options.length && !defaultElement && !lastElement)) {
    return null;
  }

  return (
    <div className={cn(styles.dropdown, className)} {...props}>
      <div className={styles.dropdownInner}>
        {(() => {
          if (options.length) {
            return options.map(({ key, name }) => (
              <div
                key={key}
                onMouseDown={event => onOptionMouseDown?.(event, key, name)}
                role="button"
                tabIndex={-1}
                className={styles.option}
              >
                {name}
              </div>
            ));
          }
          if (defaultElement) {
            return (
              <div className={styles.option} onMouseDown={onDefaultElementMouseDown}>
                {defaultElement}
              </div>
            );
          }
          return null;
        })()}

        {lastElement
          ? (
            <div className={styles.option} onMouseDown={onLastElementMouseDown}>
              {lastElement}
            </div>
          )
          : null}
      </div>
    </div>
  );
}

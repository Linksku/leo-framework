import styles from './DropdownMenuStyles.scss';

export type Options = Memoed<{ key: string | null, name: string }[]>;

export type RenderOption = Memoed<
  (key: string | null, name: string) => ReactElement | null
>;

export type Props = {
  options: Options,
  renderOption?: RenderOption,
  nullState?: Memoed<ReactNode>,
  onNullStateMouseDown?: Memoed<React.MouseEventHandler>,
  lastElement?: Memoed<ReactNode>,
  onLastElementMouseDown?: Memoed<React.MouseEventHandler>,
  open: boolean,
  fetching?: boolean,
  className?: string,
  defaultValue?: string,
  onOptionMouseDown?: Memoed<(event: React.MouseEvent, key: string | null, name: string) => void>,
} & React.HTMLAttributes<HTMLDivElement>;

// Used with Typeahead and Dropdown.
export default React.memo(function DropdownMenu({
  options,
  renderOption,
  nullState,
  onNullStateMouseDown,
  lastElement,
  onLastElementMouseDown,
  open,
  fetching,
  className,
  onOptionMouseDown,
  ...props
}: Props) {
  if (!open
    || (!options.length && !nullState && !lastElement && !fetching)) {
    return null;
  }

  function _renderInner() {
    return (
      <>
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
                {renderOption ? renderOption(key, name) : name}
              </div>
            ));
          }
          if (nullState) {
            return (
              <div
                className={cn(styles.option, styles.nullState)}
                onMouseDown={onNullStateMouseDown}
              >
                {nullState}
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
      </>
    );
  }

  return (
    <div className={cn(styles.dropdown, className)} {...props}>
      <div className={styles.dropdownInner}>
        {fetching
          ? (
            <div className={styles.option}>
              <Spinner />
            </div>
          )
          : _renderInner()}
      </div>
    </div>
  );
});

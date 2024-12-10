import styles from './DropdownMenu.scss';

export type Options = Stable<{
  key: string | null,
  name: string,
}[]>;

export type RenderOption = Stable<
  (key: string | null, name: string) => ReactElement | string | null
>;

export type Props = {
  options: Options,
  renderOption?: RenderOption,
  nullState?: Stable<ReactNode>,
  onNullStateMouseDown?: Stable<React.MouseEventHandler>,
  lastElement?: Stable<ReactNode>,
  onLastElementMouseDown?: Stable<React.MouseEventHandler>,
  open: boolean,
  fetching?: boolean,
  className?: string,
  defaultValue?: string,
  onOptionMouseDown?: Stable<(event: React.MouseEvent, key: string | null, name: string) => void>,
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
  if (!open || !(options.length || nullState || lastElement || fetching)) {
    return null;
  }

  function _renderInner() {
    return (
      <>
        {!!options.length && options.map(({ key, name }) => (
          <div
            key={key}
            onMouseDown={event => onOptionMouseDown?.(event, key, name)}
            role="button"
            tabIndex={0}
            className={styles.option}
          >
            {renderOption ? renderOption(key, name) : name}
          </div>
        ))}
        {!options.length && nullState && (
          <div
            className={cx(styles.option, styles.nullState)}
            onMouseDown={onNullStateMouseDown}
          >
            {nullState}
          </div>
        )}
        {lastElement && (
          <div
            className={styles.option}
            role="button"
            tabIndex={0}
            onMouseDown={onLastElementMouseDown}
          >
            {lastElement}
          </div>
        )}
      </>
    );
  }

  return (
    <div
      className={cx(styles.dropdown, className)}
      {...props}
    >
      <div className={styles.dropdownInner}>
        {fetching
          ? (
            <div className={styles.option}>
              <Spinner dimRem={3} fadeInDuration={0} />
            </div>
          )
          : _renderInner()}
      </div>
    </div>
  );
});

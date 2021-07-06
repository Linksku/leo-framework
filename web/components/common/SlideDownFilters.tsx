import { useAnimatedValue, useAnimation } from 'lib/hooks/useAnimation';

import styles from './SlideDownFiltersStyles.scss';

export type Filter = {
  icon?: React.SVGFactory,
  iconDim?: number,
  key: string,
  label: string,
  options: { key: string, label: string }[],
};

type Props<T> = {
  filters: Filter[],
  defaultOptions?: T,
  onChange: Memoed<(o: T) => void>,
  className?: string,
  filtersClassName?: string,
  filterClassName?: string,
  optionsClassName?: string,
};

// todo: low/mid maybe move state to parent of slidedownfilters
export default function SlideDownFilters<T extends ObjectOf<string>>({
  filters,
  defaultOptions,
  onChange,
  className,
  filtersClassName,
  filterClassName,
  optionsClassName,
}: Props<T>) {
  const [{ openedFilterKey, selectedOptions }, setState] = useState({
    openedFilterKey: null as string | null,
    selectedOptions: (defaultOptions ?? {}) as Memoed<T>,
  });
  const ref = useRef({
    prevOpenedFilterKey: openedFilterKey,
    firstRunRef: true,
  });
  if (openedFilterKey) {
    ref.current.prevOpenedFilterKey = openedFilterKey;
  }
  const { prevOpenedFilterKey } = ref.current;
  const openedFilter = filters.find(f => f.key === prevOpenedFilterKey);
  const [height, setHeight] = useAnimatedValue({
    defaultValue: 0,
  });
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();
  const optionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current.firstRunRef) {
      onChange(selectedOptions);
    }
    ref.current.firstRunRef = false;
  }, [onChange, selectedOptions]);

  useEffect(() => {
    setHeight(openedFilterKey ? optionsRef.current?.offsetHeight ?? 0 : 0);
  }, [setHeight, openedFilterKey]);

  return (
    <div className={className}>
      <div className={cn(styles.filters, filtersClassName)}>
        {filters.map(filter => {
          const Icon = filter.icon;
          return (
            <div
              key={filter.key}
              className={cn(styles.filter, {
                [styles.filterActive]: filter.key === openedFilterKey,
              }, filterClassName)}
              onClick={() => setState(s => ({
                ...s,
                openedFilterKey: s.openedFilterKey === filter.key ? null : filter.key,
              }))}
              role="button"
              tabIndex={-1}
            >
              {Icon && (
                <Icon
                  style={{ height: `${filter.iconDim}px`, width: `${filter.iconDim}px` }}
                />
              )}
              <span className={styles.label}>
                {filter.label}
              </span>
            </div>
          );
        })}
      </div>
      <div
        ref={animationRef}
        style={animationStyle(height, {
          height: x => `${x}px`,
        })}
        className={cn(styles.options, optionsClassName, {
          [styles.optionsShown]: openedFilterKey && openedFilter,
        })}
      >
        <div ref={optionsRef}>
          {prevOpenedFilterKey && openedFilter
            ? openedFilter.options.map(o => (
              <div
                key={o.key}
                className={cn(styles.option, {
                  [styles.optionActive]: o.key === selectedOptions[prevOpenedFilterKey],
                })}
                onClick={() => setState(s => ({
                  ...s,
                  openedFilterKey: null,
                  selectedOptions: { ...s.selectedOptions, [prevOpenedFilterKey]: o.key },
                }))}
                role="button"
                tabIndex={-1}
              >
                {o.label}
              </div>
            ))
            : null}
        </div>
      </div>
    </div>
  );
}

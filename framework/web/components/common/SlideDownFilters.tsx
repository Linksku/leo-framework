import { useAnimatedValue, useAnimation } from 'lib/hooks/useAnimation';

import styles from './SlideDownFiltersStyles.scss';

export type Filter<FilterKey extends string, OptionsKey extends string> = {
  icon?: React.SVGFactory,
  iconDim?: number,
  key: FilterKey,
  label: string,
  options: { key: OptionsKey, label: string }[],
};

type Props<FilterKey extends string, OptionsKey extends string> = {
  filters: Filter<FilterKey, OptionsKey>[],
  selectedOptions: Record<FilterKey, OptionsKey>,
  onChange: Memoed<(key: FilterKey, optionKey: OptionsKey) => void>,
  className?: string,
  filtersClassName?: string,
  filterClassName?: string,
  optionsClassName?: string,
};

export default function SlideDownFilters<
  FilterKey extends string,
  OptionsKey extends string,
>({
  filters,
  selectedOptions,
  onChange,
  className,
  filtersClassName,
  filterClassName,
  optionsClassName,
}: Props<FilterKey, OptionsKey>) {
  const [{ openedKey, latestOpenedKey }, setState] = useState({
    openedKey: null as FilterKey | null,
    latestOpenedKey: null as FilterKey | null,
  });
  const openedFilter = filters.find(f => f.key === latestOpenedKey);

  const animatedHeight = useAnimatedValue(0);
  const [animationRef, animationStyle] = useAnimation<HTMLDivElement>();
  const optionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    animatedHeight.setVal(openedKey ? optionsRef.current?.offsetHeight ?? 0 : 0);
  }, [animatedHeight, openedKey]);

  const optionsShown = !!(openedKey && openedFilter);
  return (
    <div className={className}>
      <div className={cn(styles.filters, filtersClassName)}>
        {filters.map(filter => {
          const Icon = filter.icon;
          return (
            <div
              key={filter.key}
              className={cn(styles.filter, {
                [styles.filterActive]: filter.key === openedKey,
              }, filterClassName)}
              onClick={() => {
                if (optionsShown) {
                  // Slightly faster than useEffect.
                  animatedHeight.setVal(0);
                }
                setState(s => ({
                  ...s,
                  openedKey: s.openedKey === filter.key ? null : filter.key,
                  latestOpenedKey: filter.key,
                }));
              }}
              role="button"
              tabIndex={-1}
            >
              {Icon && (
                <Icon
                  style={{
                    height: filter.iconDim ? `${filter.iconDim}rem` : undefined,
                    width: filter.iconDim ? `${filter.iconDim}rem` : undefined,
                  }}
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
        style={animationStyle(animatedHeight, {
          height: x => `${x}px`,
        })}
        className={cn(styles.options, optionsClassName, {
          [styles.optionsShown]: optionsShown,
        })}
      >
        <div ref={optionsRef}>
          {optionsShown && latestOpenedKey
            ? openedFilter.options.map(o => (
              <div
                key={o.key}
                className={cn(styles.option, {
                  [styles.optionActive]: o.key === selectedOptions[latestOpenedKey],
                })}
                onClick={() => {
                  setState(s => ({ ...s, openedKey: null }));
                  onChange(latestOpenedKey, o.key);
                }}
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

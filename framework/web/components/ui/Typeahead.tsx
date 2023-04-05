import type { Props as DropdownProps } from 'components/ui/DropdownMenu';
import { useThrottle } from 'utils/throttle';
import useLatest from 'hooks/useLatest';
import mergeRefs from 'utils/mergeRefs';
import useEffectOncePerDeps from 'hooks/useEffectOncePerDeps';
import Input from './Input';
import DropdownMenu, { Options, RenderOption } from './DropdownMenu';
import styles from './TypeaheadStyles.scss';

export type Props = {
  fetchResults: Memoed<(s: string) => Options | null | Promise<Options | null>>,
  renderOption?: RenderOption,
  onSelectOption?: Memoed<(key: string | null, val?: string) => void>,
  clearOnSelect?: boolean,
  defaultResults?: Options,
  defaultValue?: string,
  defaultValueUpdates?: number,
  className?: string | null,
  inputProps: Memoed<Parameters<typeof Input>[0]>,
  inputRef?: Memoed<React.RefCallback<HTMLInputElement>>,
  dropdownProps?: Memoed<Partial<MemoObjShallow<DropdownProps>>>,
  filteredValues?: Memoed<Set<string | null>>,
};

export default React.memo(function Typeahead({
  fetchResults,
  renderOption,
  onSelectOption,
  clearOnSelect,
  defaultResults,
  defaultValue,
  defaultValueUpdates,
  className,
  inputProps,
  inputRef: inputRefProp,
  dropdownProps,
  filteredValues,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [{
    input,
    isFocused,
    fetching,
    inputToResults,
  }, setState] = useStateStable({
    input: defaultValue ?? '',
    isFocused: false,
    fetching: false,
    inputToResults: {} as Memoed<ObjectOf<Options | null>>,
  });
  const stateRef = useLatest({
    inputToResults,
  });
  const throttledFetchResults = useThrottle(
    async (newInput: string) => {
      if (TS.hasProp(stateRef.current.inputToResults, newInput)) {
        setState({ input: newInput, fetching: false });
        return;
      }

      setState({ fetching: true });
      let data = await fetchResults(newInput);
      if (data && !data.length) {
        data = EMPTY_ARR;
      }
      setState(s => ({
        inputToResults: s.inputToResults[newInput] === data
          ? s.inputToResults
          : markMemoed({
            ...s.inputToResults,
            [newInput]: data as Options | null,
          }),
        input: newInput,
        fetching: false,
      }));
    },
    useConst({
      timeout: 1000,
    }),
    [fetchResults],
  );

  useEffectOncePerDeps(() => {
    setState({ input: defaultValue ?? '' });
  }, [defaultValue, defaultValueUpdates]);

  useEffect(() => {
    if (inputRef.current) {
      // https://stackoverflow.com/a/46012210/599184
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const setValue = TS.defined(Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set);
      setValue.call(inputRef.current, input);
      inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }, [input]);

  useEffect(() => {
    if (input === '') {
      onSelectOption?.(null);
    }
  }, [input, onSelectOption]);

  useEffect(() => {
    if (inputProps.disabled) {
      setState({ isFocused: false });
    }
  }, [inputProps.disabled, setState]);

  const results = useMemo(
    () => {
      if (!input) {
        return defaultResults;
      }
      const results2 = inputToResults[input];
      return results2?.length
        ? results2.filter(val => !filteredValues || !filteredValues.has(val.key))
        : null;
    },
    [inputToResults, input, filteredValues, defaultResults],
  );
  const open = isFocused
    && !!results
    && !!(results.length || dropdownProps?.nullState || dropdownProps?.lastElement);
  return (
    <div
      ref={containerRef}
      className={cx(styles.container, className, {
        [styles.open]: open,
      })}
    >
      <Input
        ref={mergeRefs(inputRef, inputRefProp)}
        className={styles.input}
        onFocus={inputProps.disabled
          ? undefined
          : () => {
            setState({ isFocused: true });
            throttledFetchResults(input.trim());
          }}
        onBlur={inputProps.disabled
          ? undefined
          : () => {
            setState({ isFocused: false });
          }}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          throttledFetchResults(event.target.value.trim());
        }}
        defaultValue={input}
        autoComplete="off"
        {...inputProps}
      />
      <DropdownMenu
        options={results ?? EMPTY_ARR}
        renderOption={renderOption}
        open={open}
        fetching={fetching}
        onOptionMouseDown={useCallback(
          (event: React.MouseEvent, key: string | null, name: string) => {
            event.preventDefault();
            if (clearOnSelect) {
              setState({ input: '' });
            } else {
              setState({ input: name });
            }

            if (inputRef.current) {
              inputRef.current.blur();
            }
            onSelectOption?.(key, name);
          },
          [clearOnSelect, onSelectOption, setState],
        )}
        {...dropdownProps}
      />
    </div>
  );
});

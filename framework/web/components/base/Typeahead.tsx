import AngleDownSvg from 'svgs/fa5/angle-down-solid.svg';
import AngleUpSvg from 'svgs/fa5/angle-up-solid.svg';

import type { Props as DropdownProps } from 'components/base/DropdownMenu';
import { useThrottle } from 'utils/throttle';
import useLatest from 'hooks/useLatest';
import mergeRefs from 'utils/mergeRefs';
import shallowEqual from 'utils/shallowEqual';
import Input from './Input';
import DropdownMenu, { Options, RenderOption } from './DropdownMenu';

import styles from './Typeahead.scss';

export type Props = {
  fetchResults: Stable<(s: string) => Options | null | Promise<Options | null>>,
  renderOption?: RenderOption,
  onSelectOption?: Stable<(key: string | null, val?: string) => void>,
  clearOnSelect?: boolean,
  defaultResults?: Options,
  defaultValue?: string,
  defaultValueUpdates?: number,
  className?: string | null,
  inputProps: Stable<Parameters<typeof Input>[0]>,
  inputRef?: Stable<React.RefCallback<HTMLInputElement>>,
  dropdownProps?: Stable<Partial<StableShallow<DropdownProps>>>,
  filteredValues?: Stable<Set<string | null>>,
  marginBottom?: string | number,
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
  marginBottom,
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
    inputToResults: new Map() as Stable<Map<string, Options | null>>,
  });
  const stateRef = useLatest({
    inputToResults,
  });
  const disableNextClick = useRef(false);
  const throttledFetchResults = useThrottle(
    async (newInput: string) => {
      if (stateRef.current.inputToResults.has(newInput)) {
        setState({ fetching: false });
        return;
      }

      setState({ fetching: true });
      let data: Nullish<Options> = await fetchResults(newInput);
      if (!data?.length) {
        data = EMPTY_ARR;
      }
      setState(s => {
        if (shallowEqual(s.inputToResults.get(newInput), data)) {
          return {
            ...s,
            fetching: false,
          };
        }
        const newInputToResults = markStable(new Map(s.inputToResults));
        newInputToResults.set(newInput, data ?? null);
        return {
          ...s,
          inputToResults: newInputToResults,
          fetching: false,
        };
      });
    },
    useConst({
      timeout: 500,
      debounce: true,
    }),
    [fetchResults],
  );

  useEffect(() => {
    setState({ input: defaultValue ?? '' });
  }, [defaultValue, defaultValueUpdates, setState]);

  useEffect(() => {
    if (inputRef.current && inputRef.current.value !== input) {
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

  const defaultResultsIfEmpty = input ? null : defaultResults;
  const results = useMemo(
    () => {
      if (defaultResultsIfEmpty) {
        return defaultResultsIfEmpty;
      }
      const results2 = inputToResults.get(input);
      const filtered = filteredValues
        ? results2?.filter(val => !filteredValues || !filteredValues.has(val.key))
        : results2;
      return filtered?.length ? filtered : EMPTY_ARR;
    },
    [inputToResults, input, filteredValues, defaultResultsIfEmpty],
  );

  const nullState = input ? dropdownProps?.nullState : null;
  const hasDropdownContent = !!(results?.length
    || nullState
    || dropdownProps?.lastElement
    || fetching);
  const open = isFocused && !!results && hasDropdownContent;
  // todo: mid/mid add clear input btn to typeahead
  return (
    <div
      ref={containerRef}
      className={cx(styles.container, className)}
      style={{
        marginBottom,
      }}
    >
      <Input
        ref={mergeRefs(inputRef, inputRefProp)}
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
          const newInput = event.target.value.trim();
          setState({ input: newInput });
          throttledFetchResults(newInput);
        }}
        defaultValue={input}
        autoComplete="off"
        suffix={
          open
            ? <AngleUpSvg />
            : (hasDropdownContent ? <AngleDownSvg /> : null)
        }
        suffixProps={{
          // Event order is pointerDown -> blur -> click
          onPointerDown: () => {
            disableNextClick.current = open;
          },
          onClick: e => {
            if (disableNextClick.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          },
        }}
        marginBottom={0}
        className={cx({
          [styles.openInput]: open,
        })}
        {...inputProps}
        error={open ? !!inputProps.error : inputProps.error}
      />
      <DropdownMenu
        options={results?.length ? results : EMPTY_ARR}
        renderOption={renderOption}
        open={open}
        fetching={fetching}
        onOptionMouseDown={useCallback(
          (event: React.MouseEvent, key: string | null, name: string) => {
            event.preventDefault();
            if (clearOnSelect) {
              setState({ input: '', isFocused: false });
            } else {
              setState({ input: name, isFocused: false });
            }

            if (inputRef.current) {
              inputRef.current.blur();
            }
            onSelectOption?.(key, name);
          },
          [clearOnSelect, onSelectOption, setState],
        )}
        {...dropdownProps}
        nullState={nullState}
      />
    </div>
  );
});

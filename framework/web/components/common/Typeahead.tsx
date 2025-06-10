import AngleDownSvg from 'svgs/fa5/solid/angle-down.svg';
import AngleUpSvg from 'svgs/fa5/solid/angle-up.svg';

import type { Props as DropdownProps } from 'components/common/DropdownMenu';
import { useThrottle } from 'utils/throttle';
import useLatest from 'utils/useLatest';
import mergeRefs from 'utils/mergeRefs';
import shallowEqual from 'utils/shallowEqual';
import hideVirtualKeyboard from 'utils/hideVirtualKeyboard';
import Input from './Input';
import DropdownMenu, { Options } from './DropdownMenu';

import styles from './Typeahead.scss';

export type Props = {
  fetchResults: Stable<(s: string) => Options | null | Promise<Options | null>>,
  renderOption?: Stable<
    (key: string | null, name: string, hasInput: boolean) => ReactElement | string | null
  >,
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
      if (data?.length === 0) {
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
      timeout: 200,
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

  const hasInput = !!input;
  const renderOptionWrap = useCallback(
    (key, name) => (renderOption ? renderOption(key, name, hasInput) : null),
    [renderOption, hasInput],
  );

  const defaultResultsIfEmpty = input ? null : defaultResults;
  const results = useMemo(
    () => {
      if (defaultResultsIfEmpty) {
        return defaultResultsIfEmpty;
      }
      const results2 = inputToResults.get(input);
      return filteredValues
        ? results2?.filter(val => !filteredValues || !filteredValues.has(val.key))
        : results2;
    },
    [inputToResults, input, filteredValues, defaultResultsIfEmpty],
  );

  const nullState = input ? dropdownProps?.nullState : null;
  const hasDropdownContent = !!(results?.length
    || nullState
    || dropdownProps?.lastElement
    || (fetching && input));
  const open = isFocused && !!results && hasDropdownContent;
  const SuffixSvg = open
    ? AngleUpSvg
    : (hasDropdownContent ? AngleDownSvg : null);
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
            if (stateRef.current.inputToResults.has(input.trim())
              || !input) {
              setState({ isFocused: true });
            } else {
              setState({ isFocused: true, fetching: true });
              throttledFetchResults(input.trim());
            }
          }}
        onBlur={inputProps.disabled
          ? undefined
          : () => {
            setState({ isFocused: false });
          }}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          const newInput = event.target.value.trim();
          if (stateRef.current.inputToResults.has(newInput)
            || !newInput) {
            setState({ input: newInput });
          } else {
            setState({ input: newInput, fetching: true });
            throttledFetchResults(newInput);
          }
        }}
        defaultValue={input}
        autoComplete="off"
        SuffixSvg={
          inputProps.suffix
            ? null
            : SuffixSvg
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
        overrides={{
          marginBottom: '0',
        }}
        className={cx({
          [styles.openInput]: open,
        })}
        {...inputProps}
        error={open ? !!inputProps.error : inputProps.error}
      />
      <DropdownMenu
        options={results?.length ? results : EMPTY_ARR}
        renderOption={renderOption ? renderOptionWrap : undefined}
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

            hideVirtualKeyboard();

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

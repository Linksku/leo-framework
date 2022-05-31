import type { Props as DropdownProps } from 'components/ui/DropdownMenu';
import { useThrottle } from 'utils/throttle';
import useLatest from 'utils/hooks/useLatest';
import mergeRefs from 'utils/mergeRefs';
import useEffectOncePerDeps from 'utils/hooks/useEffectOncePerDeps';
import Input from './Input';
import DropdownMenu from './DropdownMenu';
import styles from './TypeaheadStyles.scss';

type Results = { key: string | null, name: string }[];

export type Props = {
  fetchResults: Memoed<(s: string) => Results | Promise<Results>>,
  onSelectOption?: Memoed<(key: string | null, val?: string) => void>,
  clearOnSelect?: boolean,
  defaultValue?: string,
  className?: string | null,
  inputProps: Parameters<typeof Input>[0],
  inputRef?: React.RefCallback<HTMLInputElement>,
  dropdownProps?: Partial<DropdownProps>,
};

export default function Typeahead({
  fetchResults,
  onSelectOption,
  clearOnSelect,
  defaultValue,
  className,
  inputProps,
  inputRef: inputRefProp,
  dropdownProps,
}: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [{ input, isFocused, inputToResults }, setState] = useState({
    input: defaultValue ?? '',
    isFocused: false,
    inputToResults: {} as ObjectOf<Memoed<Results>>,
  });
  const stateRef = useLatest({
    inputToResults,
  });
  const throttledFetchResults = useThrottle(
    async (newInput: string) => {
      if (TS.hasProp(stateRef.current.inputToResults, newInput)) {
        setState(s => ({
          ...s,
          input: newInput,
        }));
        return;
      }

      // todo: mid/easy add loading state for typeahead
      const data = await fetchResults(newInput);
      setState(s => ({
        ...s,
        inputToResults: {
          ...s.inputToResults,
          [newInput]: data as Memoed<Results>,
        },
        input: newInput,
      }));
    },
    useConst({
      timeout: 1000,
      allowSchedulingDuringDelay: true,
    }),
    [fetchResults],
  );

  useEffectOncePerDeps(() => {
    setState(s => ({
      ...s,
      input: defaultValue ?? '',
    }));
  }, [defaultValue]);

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

  const results = inputToResults[input] ?? EMPTY_ARR;
  const isOpen = isFocused
      && !!(results.length || dropdownProps?.defaultElement || dropdownProps?.lastElement);
  return (
    <div
      ref={containerRef}
      className={cn(styles.container, className, { [styles.open]: isOpen })}
    >
      <Input
        ref={mergeRefs(inputRef, inputRefProp)}
        className={styles.input}
        onFocus={() => {
          setState(s => (s.isFocused ? s : { ...s, isFocused: true }));
          throttledFetchResults(input);
        }}
        onBlur={() => {
          setState(s => (!s.isFocused ? s : { ...s, isFocused: false }));
        }}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
          setState(
            s => (s.isFocused || s.input === event.target.value
              ? s
              : { ...s, isFocused: true }),
          );
          throttledFetchResults(event.target.value);
        }}
        defaultValue={input}
        autoComplete="off"
        {...inputProps}
      />
      <DropdownMenu
        options={results}
        open={isOpen}
        onOptionMouseDown={useCallback(
          (event: React.MouseEvent, key: string | null, name: string) => {
            event.preventDefault();
            if (clearOnSelect) {
              setState(s => (s.input === '' ? s : {
                ...s,
                input: '',
              }));
            } else {
              setState(s => ({
                ...s,
                input: name,
                isFocused: false,
              }));
            }
            onSelectOption?.(key, name);
          },
          [clearOnSelect, onSelectOption],
        )}
        {...dropdownProps}
      />
    </div>
  );
}

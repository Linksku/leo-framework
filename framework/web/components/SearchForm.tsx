import SearchSvg from 'svgs/fa5/search-regular.svg';
import TimesSvg from 'svgs/fa5/times-regular.svg';

import { useThrottle } from 'utils/throttle';
import Form from 'components/form/Form';
import { addPopHandler } from 'stores/history/HistoryStore';
import useEffectInitialMount from 'utils/useEffectInitialMount';

import styles from './SearchForm.scss';

type Props = {
  submitOnInput?: boolean,
  onInput?: Stable<React.FormEventHandler<HTMLInputElement>>,
  onSubmit: Stable<(query: string) => void>,
  throttleTimeout?: number,
  defaultValue?: string,
  placeholder?: string,
  inputProps?: Stable<Parameters<typeof Input>[0]>,
};

export default React.memo(function SearchForm({
  submitOnInput = true,
  onInput,
  onSubmit,
  throttleTimeout = 200,
  defaultValue = '',
  placeholder,
  inputProps,
}: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [lastSubmitted, setLastSubmitted] = useState(defaultValue);
  const [showClear, setShowClear] = useState(!!defaultValue);

  const handleSubmit = useCallback(
    () => {
      const val = inputRef.current?.value ?? '';
      setLastSubmitted(val);
      setShowClear(!!val);
      onSubmit(val);
    },
    [onSubmit],
  );

  const throttledHandleSubmit = useThrottle(
    handleSubmit,
    useMemo(() => ({
      timeout: throttleTimeout,
      debounce: true,
    }), [throttleTimeout]),
    [handleSubmit],
  );

  const clearForm = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = defaultValue;
    }
    setLastSubmitted(defaultValue);
    setShowClear(false);
    onSubmit(defaultValue);
  }, [defaultValue, onSubmit]);

  useEffect(() => {
    const removePopHandler = lastSubmitted && lastSubmitted !== defaultValue
      ? addPopHandler(() => {
        clearForm();
        return true;
      })
      : null;

    return () => {
      removePopHandler?.();
    };
  }, [lastSubmitted, defaultValue, clearForm]);

  useEffectInitialMount(() => {
    if (defaultValue && inputRef.current) {
      inputRef.current.value = defaultValue;
    }
  });

  return (
    <Form
      onSubmit={() => handleSubmit()}
      submitOnEnter
    >
      <Input
        ref={inputRef}
        name="query"
        placeholder={placeholder ?? 'Search...'}
        SuffixSvg={showClear ? TimesSvg : SearchSvg}
        suffixClassName={styles.suffix}
        suffixProps={{
          onClick: showClear
            ? () => {
              if (inputRef.current) {
                inputRef.current.value = '';
              }
              setLastSubmitted('');
              setShowClear(false);
              onSubmit('');
            }
            : () => handleSubmit(),
        }}
        autoCapitalize="none"
        autoCorrect="off"
        onInput={e => {
          if (submitOnInput) {
            throttledHandleSubmit();
            setShowClear(inputRef.current?.value !== defaultValue);
          } else if (showClear
            && (inputRef.current?.value !== lastSubmitted
              || lastSubmitted === defaultValue)) {
            setShowClear(false);
          }
          onInput?.(e);
        }}
        overrides={{
          marginBottom: '0.5rem',
        }}
        {...inputProps}
      />
    </Form>
  );
});

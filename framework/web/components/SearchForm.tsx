import SearchSvg from 'fa5/svg/search-regular.svg';

import { useThrottle } from 'utils/throttle';
import Form from 'components/common/Form';
import { useAddPopHandler } from 'stores/HistoryStore';

import styles from './SearchFormStyles.scss';

type Props = {
  onInput?: Stable<React.FormEventHandler<HTMLInputElement>>,
  onSubmit: Stable<(query: string) => void>,
  throttleTimeout?: number,
  defaultValue?: string,
  placeholder?: string,
  inputProps?: Stable<Parameters<typeof Input>[0]>,
};

export default React.memo(function SearchForm({
  onInput,
  onSubmit,
  throttleTimeout = 1000,
  defaultValue,
  placeholder,
  inputProps,
}: Props) {
  const { register, handleSubmit } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      query: defaultValue ?? '',
    },
  });
  const addPopHandler = useAddPopHandler();
  const lastSubmitted = useRef(defaultValue);

  const _handleSubmit = handleSubmit(useThrottle(
    ({ query }) => {
      if (!lastSubmitted.current && query) {
        addPopHandler(() => {
          lastSubmitted.current = '';
          onSubmit('');
          return true;
        });
      }

      lastSubmitted.current = query;
      onSubmit(query);
    },
    useMemo(() => ({
      timeout: throttleTimeout,
    }), [throttleTimeout]),
    [onSubmit],
  ));

  return (
    <Form
      onSubmit={_handleSubmit}
    >
      <Input
        name="query"
        placeholder={placeholder ?? 'Search...'}
        suffix={(
          <SearchSvg
            className={styles.icon}
          />
        )}
        suffixProps={{
          onClick: _handleSubmit,
        }}
        register={register}
        autoCapitalize="none"
        autoCorrect="off"
        onInput={onInput}
        marginBottom="0.5rem"
        {...inputProps}
      />
    </Form>
  );
});

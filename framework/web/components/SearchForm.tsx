import SearchSvg from 'fa5/svg/search-regular.svg';

import { useThrottle } from 'utils/throttle';

import styles from './SearchFormStyles.scss';

type Props = {
  onSubmit: Memoed<(query: string) => void>,
  throttleTimeout?: number,
  defaultValue?: string,
  placeholder?: string,
};

export default React.memo(function SearchForm({
  onSubmit,
  throttleTimeout = 1000,
  defaultValue,
  placeholder,
}: Props) {
  const { register, handleSubmit } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      query: defaultValue ?? '',
    },
  });

  const _handleSubmit = handleSubmit(useThrottle(
    ({ query }) => {
      onSubmit(query);
    },
    useDeepMemoObj({
      timeout: throttleTimeout,
    }),
    [onSubmit],
  ));

  return (
    <form
      onSubmit={_handleSubmit}
    >
      <Input
        name="query"
        placeholder={placeholder ?? 'Search...'}
        suffix={(
          <SearchSvg
            className={styles.icon}
            onClick={_handleSubmit}
          />
        )}
        register={register}
        autoCapitalize="none"
        autoCorrect="off"
        className={styles.input}
      />
    </form>
  );
});

import SearchSvg from 'fontawesome5/svgs/solid/search.svg';

import { useThrottle } from 'utils/throttle';

import styles from './SearchFormStyles.scss';

export type OnSubmitSearchForm = Memoed<(query: string) => void>;

type Props = {
  onSubmit: OnSubmitSearchForm,
  throttleTimeout?: number,
};

export default function SearchForm({ onSubmit, throttleTimeout = 1000 }: Props) {
  const { register, handleSubmit } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      query: '',
    },
  });

  const _handleSubmit = handleSubmit(useThrottle(
    ({ query }) => {
      onSubmit(query);
    },
    useDeepMemoObj({
      timeout: throttleTimeout,
      allowSchedulingDuringDelay: true,
    }),
    [onSubmit],
  ));

  return (
    <form
      onSubmit={_handleSubmit}
    >
      <Input
        name="query"
        placeholder="Search..."
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
}

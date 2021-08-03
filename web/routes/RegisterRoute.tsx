import StackWrapInner from 'components/frame/StackWrapInner';
import HookFormErrors from 'components/HookFormErrors';
import { MIN_USER_AGE, MAX_USER_AGE } from 'consts/users';

import styles from './RegisterRouteStyles.scss';

function RegisterRoute() {
  const { register, handleSubmit, control } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      name: '',
      birthday: '',
    },
  });
  const { errors } = useFormState({ control });
  const { setAuth } = useAuthStore();

  const { fetching: submitting, fetchApi: registerUser, error: apiError } = useDeferredApi(
    'registerUser',
    {},
    {
      type: 'create',
      onFetch: useCallback(data => {
        setAuth({ authToken: data.authToken, redirectPath: '/onboard' });
      }, [setAuth]),
      onError: NOOP,
    },
  );

  return (
    <StackWrapInner
      title="Register"
      bodyClassName={styles.container}
    >
      <HookFormErrors errors={errors} additionalError={apiError} />
      <form
        onSubmit={handleSubmit(data => {
          void registerUser({
            email: data.email,
            password: data.password,
            name: data.name,
            birthday: dayjs(data.birthday).format('YYYY-MM-DD'),
          });
        })}
        className={styles.form}
      >
        <Input
          type="email"
          name="email"
          label="Email"
          register={register}
          registerOpts={{
            required: 'Email is required.',
          }}
          disabled={submitting}
          required
        />

        <Input
          type="password"
          name="password"
          label="Password"
          register={register}
          registerOpts={{
            required: 'Password is required',
            minLength: { value: 8, message: 'Password needs to be at least 8 characters.' },
            maxLength: { value: 64, message: 'Password too long.' },
          }}
          disabled={submitting}
          required
          placeholder="********"
        />

        <Input
          type="name"
          name="name"
          label="Name"
          register={register}
          registerOpts={{
            required: 'Name is required',
          }}
          disabled={submitting}
          required
        />
        <p className={styles.hint}>
          * Real name not required, but please use a realistic name.
        </p>

        <Input
          type="date"
          name="birthday"
          label="Birthday"
          register={register}
          registerOpts={{
            required: 'Birthday is required.',
            validate(date) {
              const diffYears = dayjs().diff(date, 'year', true);
              if (diffYears < MIN_USER_AGE) {
                return `You must be at least ${MIN_USER_AGE} to join.`;
              }
              if (diffYears > MAX_USER_AGE) {
                return 'Invalid age.';
              }
              return true;
            },
          }}
          disabled={submitting}
          required
        />
        <p className={styles.hint}>
          * Only used to calculate age.
        </p>

        <Button
          Component="input"
          type="submit"
          fullWidth
          disabled={submitting}
          value="Register"
        />
      </form>

      <p><a href="/login">Login</a></p>
    </StackWrapInner>
  );
}

export default React.memo(RegisterRoute);

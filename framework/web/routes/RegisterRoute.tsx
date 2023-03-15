import InfoSvg from 'fa5/svg/info-circle-solid.svg';
import dayjs from 'dayjs';

import StackWrapInner from 'components/frame/stack/StackWrapInner';
import HookFormErrors from 'components/HookFormErrors';
import { MIN_USER_AGE, MAX_USER_AGE } from 'consts/coreUsers';

import styles from './RegisterRouteStyles.scss';

export default React.memo(function RegisterRoute() {
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
  const { authState, setAuth } = useAuthStore();

  const { fetching: submitting, fetchApi: registerUser, error: apiError } = useDeferredApi(
    'registerUser',
    EMPTY_OBJ,
    {
      type: 'create',
      returnState: true,
      onFetch(data) {
        setAuth({
          authToken: data.authToken,
          userId: data.currentUserId,
          redirectPath: '/onboard?registered',
        });
      },
    },
  );

  return (
    <StackWrapInner
      title="Sign Up"
    >
      <div className={styles.container}>
        {authState === 'in' && (
          <p className={styles.loggedInMsg}>
            <InfoSvg />
            {' '}
            Already logged in.
            {' '}
            <Link href="/">Go back to home</Link>
            {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
            {'.'}
          </p>
        )}
        <form
          onSubmit={handleSubmit(data => {
            registerUser({
              email: data.email,
              password: data.password,
              name: data.name,
              birthday: dayjs(data.birthday).format('YYYY-MM-DD'),
            });
          })}
          className={styles.form}
          data-testid={TestIds.registerForm}
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
            placeholder="••••••••"
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
            * Real name not required.
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
            * Only age will be displayed.
          </p>

          <p className={styles.tos}>
            By signing up, you agree to the
            {' '}
            <Link href="/tos/terms">Terms of Service</Link>
            {' '}
            and
            {' '}
            <Link href="/tos/privacy">Privacy Policy</Link>
            , including
            {' '}
            <Link href="/tos/cookie">Cookie Policy</Link>
            {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
            {'.'}
          </p>

          <HookFormErrors errors={errors} additionalError={apiError} />

          <Button
            Component="input"
            type="submit"
            fullWidth
            disabled={submitting}
            value="Sign Up"
          />
        </form>

        <p><Link href="/login">Log In</Link></p>
      </div>
    </StackWrapInner>
  );
});

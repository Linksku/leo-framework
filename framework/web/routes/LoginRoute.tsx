import InfoSvg from 'fontawesome5/svgs/solid/info-circle.svg';

import StackWrapInner from 'components/frame/StackWrapInner';
import HookFormErrors from 'components/HookFormErrors';

import styles from './LoginRouteStyles.scss';

function LoginRoute() {
  const { register, handleSubmit, control } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const { errors } = useFormState({ control });
  const { authState, setAuth } = useAuthStore();

  const { fetching, fetchApi: loginUser, error: apiError } = useDeferredApi(
    'loginUser',
    {},
    {
      type: 'load',
      method: 'post',
      successMsg: 'Logged in successfully',
      onFetch(data) {
        setAuth({ authToken: data.authToken, userId: data.currentUserId, redirectPath: '/' });
      },
    },
  );

  // todo: high/hard google/fb login
  return (
    <StackWrapInner title="Login">
      <div className={styles.container}>
        {authState === 'in'
          ? (
            <p className={styles.loggedInMsg}>
              <InfoSvg />
              {' '}
              Already logged in.
              {' '}
              <Link href="/">Go back to home</Link>
              {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
              {'.'}
            </p>
          )
          : null}
        <HookFormErrors errors={errors} additionalError={apiError} />
        <form
          onSubmit={handleSubmit(async data => loginUser(data))}
          className={styles.form}
        >
          <Input
            type="email"
            name="email"
            label="Email"
            register={register}
            registerOpts={{
              required: 'Email is required',
            }}
            disabled={fetching}
            required
          />

          <Input
            type="password"
            name="password"
            label="Password"
            register={register}
            registerOpts={{
              required: 'Password is required.',
              minLength: { value: 8, message: 'Password is incorrect.' },
              maxLength: { value: 64, message: 'Password is incorrect.' },
            }}
            disabled={fetching}
            required
            placeholder="********"
          />

          <Button
            Component="input"
            type="submit"
            fullWidth
            disabled={fetching}
          />
        </form>

        <p>
          <Link href="/register">Register</Link>
        </p>
        <p>
          <Link href="/resetpassword">Forgot Password?</Link>
        </p>
      </div>
    </StackWrapInner>
  );
}

export default React.memo(LoginRoute);

import InfoSvg from 'fa5/svg/info-circle-solid.svg';

import StackWrapInner from 'components/frame/stack/StackWrapInner';
import Form from 'components/common/Form';
import HookFormErrors from 'components/HookFormErrors';

import styles from './LoginRouteStyles.scss';

export default React.memo(function LoginRoute() {
  const { register, handleSubmit, control } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const { errors } = useFormState({ control });
  const { authState, setAuth, isReloadingAfterAuth } = useAuthStore();

  const { fetching, fetchApi: loginUser, error: apiError } = useDeferredApi(
    'loginUser',
    EMPTY_OBJ,
    {
      type: 'load',
      method: 'post',
      returnState: true,
      successMsg: 'Logged in successfully',
      onFetch(data) {
        setAuth({
          authToken: data.authToken,
          userId: data.currentUserId,
          redirectPath: '/',
        });
      },
    },
  );

  const disabled = fetching || isReloadingAfterAuth || authState === 'in';
  // todo: high/hard google/fb login
  return (
    <StackWrapInner title="Log In">
      <div className={styles.container}>
        {authState === 'in' && (
          <p className={styles.loggedInMsg}>
            {isReloadingAfterAuth
              ? 'Logging in.'
              : (
                <>
                  <InfoSvg />
                  {' '}
                  Already logged in.
                  {' '}
                  <Link href="/">Go back to home</Link>
                  {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
                  {'.'}
                </>
              )}
          </p>
        )}

        <Form
          onSubmit={handleSubmit(data => loginUser(data))}
          className={styles.form}
          data-testid={TestIds.loginForm}
        >
          <Input
            type="email"
            name="email"
            label="Email"
            register={register}
            registerOpts={{
              required: 'Email is required',
            }}
            disabled={disabled}
            autoFocus
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
            disabled={disabled}
            placeholder="••••••••"
          />

          <HookFormErrors errors={errors} additionalError={apiError} />

          <Button
            Element="input"
            type="submit"
            value={fetching ? 'Logging In' : 'Log In'}
            fullWidth
            disabled={disabled}
          />
        </Form>

        <p>
          <Link href="/register">Sign Up</Link>
        </p>
        <p>
          <Link href="/resetpassword">Forgot Password?</Link>
        </p>
      </div>
    </StackWrapInner>
  );
});

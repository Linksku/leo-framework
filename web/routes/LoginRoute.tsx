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
  const { setAuth } = useAuthStore();

  const { fetching, fetchApi: loginUser, error: apiError } = useDeferredApi(
    'loginUser',
    {},
    {
      type: 'load',
      method: 'post',
      onFetch: useCallback(data => {
        setAuth({ authToken: data.authToken, redirectPath: '/' });
      }, [setAuth]),
      onError: NOOP,
    },
  );

  // todo: high/mid google/fb login
  return (
    <StackWrapInner title="Login">
      <div className={styles.container}>
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
              minLength: 8,
            }}
            disabled={fetching}
            required
          />

          <Button
            Component="input"
            type="submit"
            fullWidth
            disabled={fetching}
          />
        </form>

        <p>
          <a href="/register">Register</a>
        </p>
        <p>
          <a href="/resetpassword">Forgot Password?</a>
        </p>
      </div>
    </StackWrapInner>
  );
}

export default React.memo(LoginRoute);

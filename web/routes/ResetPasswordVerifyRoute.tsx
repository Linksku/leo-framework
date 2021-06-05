import StackWrapInner from 'components/frame/StackWrapInner';
import HookFormErrors from 'components/HookFormErrors';

import styles from './ResetPasswordVerifyRouteStyles.scss';

function ResetPasswordVerifyRoute({ query }: RouteProps) {
  const { register, handleSubmit, control } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      password: '',
    },
  });
  const { errors } = useFormState({ control });
  const { setAuth } = useAuthStore();

  const userId = Number.parseInt(query?.userId, 10);

  const { fetching, fetchApi: verifyResetPassword, error: apiError } = useDeferredApi(
    'verifyResetPassword',
    { userId, token: query?.token },
    {
      type: 'load',
      method: 'post',
      onFetch: useCallback(data => {
        setAuth({ authToken: data.authToken, redirectPath: '/' });
      }, [setAuth]),
      onError: NOOP,
    },
  );

  return (
    <StackWrapInner title="Reset Password">
      <div className={styles.container}>
        <HookFormErrors errors={errors} additionalError={apiError} />

        <form
          onSubmit={handleSubmit(async data => verifyResetPassword(data))}
          className={styles.form}
        >
          <Input
            type="password"
            name="password"
            label="Password"
            register={register}
            registerOpts={{
              required: 'Password is required.',
              minLength: 8,
              maxLength: 64,
            }}
            disabled={fetching}
            required
          />

          <Button
            Component="input"
            type="submit"
            disabled={fetching}
          />
        </form>

        <p><a href="/login">Log In</a></p>
      </div>
    </StackWrapInner>
  );
}

export default React.memo(ResetPasswordVerifyRoute);

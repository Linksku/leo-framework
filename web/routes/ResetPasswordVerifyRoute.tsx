import StackWrapInner from 'components/frame/StackWrapInner';
import HookFormErrors from 'components/HookFormErrors';

import styles from './ResetPasswordVerifyRouteStyles.scss';

function ResetPasswordVerifyRoute() {
  const { query: { token, userId } } = useRouteStore();
  const { register, handleSubmit, control } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      password: '',
    },
  });
  const { errors } = useFormState({ control });
  const { setAuth } = useAuthStore();

  const { fetching, fetchApi: verifyResetPassword, error: apiError } = useDeferredApi(
    'verifyResetPassword',
    {
      userId: TS.parseIntOrNull(userId) ?? 0,
      token: typeof token === 'string' ? token : undefined,
    },
    {
      type: 'load',
      method: 'post',
      onFetch(data) {
        setAuth({ authToken: data.authToken, userId: data.currentUserId, redirectPath: '/' });
      },
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
              minLength: { value: 8, message: 'Password needs to be at least 8 characters.' },
              maxLength: { value: 64, message: 'Password too long.' },
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

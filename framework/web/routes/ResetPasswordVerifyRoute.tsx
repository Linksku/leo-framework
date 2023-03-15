import StackWrapInner from 'components/frame/stack/StackWrapInner';
import HookFormErrors from 'components/HookFormErrors';

import styles from './ResetPasswordVerifyRouteStyles.scss';

export default React.memo(function ResetPasswordVerifyRoute() {
  const { token: _token, userId: _userId } = useRouteQuery();
  const token = typeof _token === 'string' ? _token : undefined;
  const userId = TS.parseIntOrNull(_userId) ?? 0;

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
    useMemo(() => ({
      userId,
      token,
    }), [userId, token]),
    {
      type: 'load',
      method: 'post',
      returnState: true,
      successMsg: 'Reset password successfully',
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
          onSubmit={handleSubmit(data => verifyResetPassword(data))}
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
            placeholder="••••••••"
          />

          <Button
            Component="input"
            type="submit"
            value="Save"
            disabled={fetching}
          />
        </form>

        <p><Link href="/login">Log In</Link></p>
      </div>
    </StackWrapInner>
  );
});

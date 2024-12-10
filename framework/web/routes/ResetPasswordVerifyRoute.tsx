import StackWrapInner from 'core/frame/stack/StackWrapInner';
import Form from 'components/form/Form';
import HookFormErrors from 'components/form/HookFormErrors';
import PasswordInput from 'components/form/PasswordInput';

import styles from './ResetPasswordVerifyRoute.scss';

export default React.memo(function ResetPasswordVerifyRoute() {
  const { token: _token } = useRouteQuery<'ResetPasswordVerify'>();
  const token = typeof _token === 'string' ? _token : undefined;

  const { register, handleSubmit, control } = useForm({
    mode: 'onBlur',
    defaultValues: {
      password: '',
    },
  });
  const { errors } = useFormState({ control });
  const { setAuth } = useAuthStore();

  const { fetching, fetchApi: verifyResetPassword, error: apiError } = useDeferredApi(
    'verifyResetPassword',
    EMPTY_OBJ,
    {
      type: 'load',
      method: 'post',
      returnState: true,
      successMsg: 'Reset password successfully',
      onFetch(data) {
        setAuth({
          authToken: data.authToken,
          userId: data.currentUserId,
          redirectPath: '/',
        });
      },
    },
  );

  const {
    password: passwordError,
    ...otherErrors
  } = errors;
  return (
    <StackWrapInner title="Reset Password">
      <div className={styles.container}>
        <Form
          onSubmit={token
            ? handleSubmit(data => verifyResetPassword({ ...data, token }))
            : NOOP}
          submitOnEnter
          className={styles.form}
        >
          <PasswordInput
            name="password"
            label="Password"
            register={register}
            registerOpts={{
              required: 'Password is required.',
              minLength: { value: 8, message: 'Password needs to be at least 8 characters.' },
              maxLength: { value: 64, message: 'Password too long.' },
            }}
            error={passwordError?.message}
            disabled={fetching}
          />

          <HookFormErrors
            control={control}
            errors={otherErrors}
            additionalError={apiError}
            marginBottom="2.5rem"
          />

          <Button
            Element="input"
            type="submit"
            value={fetching ? 'Saving' : 'Save'}
            disabled={fetching || !token}
          />
        </Form>

        <p>
          <Link href="/login" replace>Log In</Link>
        </p>
      </div>
    </StackWrapInner>
  );
});

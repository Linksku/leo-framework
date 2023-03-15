import StackWrapInner from 'components/frame/stack/StackWrapInner';
import HookFormErrors from 'components/HookFormErrors';

import styles from './ResetPasswordRouteStyles.scss';

export default React.memo(function ResetPasswordRoute() {
  const { register, handleSubmit, control } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      email: '',
    },
  });
  const { errors } = useFormState({ control });
  const showAlert = useShowAlert();

  const { fetching, fetchApi: resetPassword, error: apiError } = useDeferredApi(
    'resetPassword',
    EMPTY_OBJ,
    {
      type: 'load',
      method: 'post',
      returnState: true,
      onFetch() {
        showAlert({
          msg: 'A password reset email was sent',
          onClose() {
            window.history.back();
          },
        });
      },
    },
  );

  return (
    <StackWrapInner title="Reset Password">
      <div className={styles.container}>
        <form
          onSubmit={handleSubmit(data => resetPassword(data))}
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
            disabled={fetching}
            required
          />

          <HookFormErrors errors={errors} additionalError={apiError} />

          <Button
            Component="input"
            type="submit"
            fullWidth
            disabled={fetching}
          />
        </form>

        <p><Link href="/login">Log In</Link></p>
      </div>
    </StackWrapInner>
  );
});

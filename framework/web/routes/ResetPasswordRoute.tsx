import StackWrapInner from 'components/frame/StackWrapInner';
import HookFormErrors from 'components/HookFormErrors';

import styles from './ResetPasswordRouteStyles.scss';

function ResetPasswordRoute() {
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
    {},
    {
      type: 'load',
      method: 'post',
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
        <HookFormErrors errors={errors} additionalError={apiError} />
        <form
          onSubmit={handleSubmit(async data => resetPassword(data))}
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
}

export default React.memo(ResetPasswordRoute);

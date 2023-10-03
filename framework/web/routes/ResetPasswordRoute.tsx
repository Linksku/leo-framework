import StackWrapInner from 'components/frame/stack/StackWrapInner';
import Form from 'components/common/Form';
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
  const authState = useAuthState();
  const { backState } = useRouteStore();
  const pushPath = usePushPath();

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
            if (backState) {
              window.history.back();
            } else {
              pushPath('/login');
            }
          },
        });
      },
    },
  );

  const disabled = fetching || authState === 'in';
  return (
    <StackWrapInner title="Reset Password">
      <div className={styles.container}>
        <Form
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
            disabled={disabled}
          />

          <HookFormErrors errors={errors} additionalError={apiError} />

          <Button
            Element="input"
            type="submit"
            value={fetching ? 'Sending' : 'Send'}
            fullWidth
            disabled={disabled}
          />
        </Form>

        <p><Link href="/login">Log In</Link></p>
      </div>
    </StackWrapInner>
  );
});

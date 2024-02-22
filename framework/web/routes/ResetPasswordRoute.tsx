import StackWrapInner from 'components/frame/stack/StackWrapInner';
import Form from 'components/common/Form';
import HookFormErrors from 'components/HookFormErrors';

import styles from './ResetPasswordRoute.scss';

export default React.memo(function ResetPasswordRoute() {
  const query = useRouteQuery();
  const defaultEmail = query?.email;

  const { register, handleSubmit, control } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      email: typeof defaultEmail === 'string' ? defaultEmail : '',
    },
  });
  const { errors } = useFormState({ control });
  const showAlert = useShowAlert();
  const authState = useAuthState();
  const { backState, isRouteActive } = useRouteStore();
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
          title: 'Success',
          msg: 'If that email exists in our system, a password reset email was sent',
          onClose() {
            if (isRouteActive && backState) {
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

        <p>
          <Link href="/login" replace>Log In</Link>
        </p>
        <p>
          <Link href="/support">Support</Link>
        </p>
      </div>
    </StackWrapInner>
  );
});

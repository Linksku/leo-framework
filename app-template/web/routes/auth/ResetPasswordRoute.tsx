import RouteInner from 'core/frame/RouteInner';
import Form from 'components/form/Form';
import HookFormErrors from 'components/form/HookFormErrors';
import historyQueue from 'core/globalState/historyQueue';

import styles from './ResetPasswordRoute.scss';

export default React.memo(function ResetPasswordRoute() {
  const query = useRouteQuery<'ResetPassword'>();
  const defaultEmail = query?.email;

  const { register, handleSubmit, control } = useForm({
    mode: 'onBlur',
    defaultValues: {
      email: typeof defaultEmail === 'string' ? defaultEmail : '',
    },
  });
  const { errors } = useFormState({ control });
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
        showModal({
          title: 'Success',
          msg: 'If that email exists in our system, a password reset email was sent',
          onClose() {
            if (isRouteActive && backState) {
              historyQueue.back();
            } else {
              pushPath('/login');
            }
          },
        });
      },
    },
  );

  const {
    email: emailError,
    ...otherErrors
  } = errors;
  // Don't disable when logged in; users without password need this
  const disabled = fetching;
  return (
    <RouteInner
      title="Reset Password"
      className={styles.container}
    >
      <Form
        onSubmit={handleSubmit(data => resetPassword(data))}
        submitOnEnter
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

        <HookFormErrors
          control={control}
          errors={otherErrors}
          additionalError={apiError}
          marginBottom="2.5rem"
        />

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
    </RouteInner>
  );
});

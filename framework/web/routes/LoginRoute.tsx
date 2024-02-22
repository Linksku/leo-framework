import InfoSvg from 'svgs/fa5/info-circle-solid.svg';

import type ApiError from 'core/ApiError';
import StackWrapInner from 'components/frame/stack/StackWrapInner';
import Form from 'components/common/Form';
import HookFormErrors from 'components/HookFormErrors';
import useLoginRedirectPathStorage from 'hooks/storage/useLoginRedirectPathStorage';
import { getPathFromState } from 'stores/HistoryStore';
import InfoBanner from 'components/common/InfoBanner';
import GoogleLoginButton from 'components/buttons/GoogleLoginButton';
import detectPlatform from 'utils/detectPlatform';

import styles from './LoginRoute.scss';

const AppleLoginButton = React.lazy(async () => import(
  /* webpackChunkName: 'AppleLoginButton' */ 'components/buttons/AppleLoginButton'
));

// todo: high/easy show 503 on forms
export default React.memo(function LoginRoute() {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
  } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const { errors } = useFormState({ control });
  const selectedEmail = watch('email');

  const pushPath = usePushPath();
  const { authState, setAuth, isReloadingAfterAuth } = useAuthStore();
  const { backState } = useRouteStore();
  const [redirectPath, _, resetRedirectPath] = useLoginRedirectPathStorage(
    backState && backState.path !== '/login' && backState.path !== '/register'
      ? getPathFromState(backState)
      : undefined,
  );
  const onSubmitEmail = useCallback((email: string) => {
    if (!selectedEmail.includes('@')) {
      setValue('email', email);
    }
  }, [selectedEmail, setValue]);
  const onFetch = useCallback((data: ApiData<'loginUser'>) => {
    resetRedirectPath();
    setAuth({
      authToken: data.authToken,
      userId: data.currentUserId,
      redirectPath: redirectPath ?? '/',
    });
  }, [resetRedirectPath, setAuth, redirectPath]);
  const registerUrl = selectedEmail.includes('@')
    ? `/register?email=${encodeURIComponent(selectedEmail)}`
    : '/register';
  const onError = useCallback((err: ApiError) => {
    if (err.status === 401 && selectedEmail.includes('@')) {
      pushPath(registerUrl);
    }
  }, [pushPath, selectedEmail, registerUrl]);

  const { fetching, fetchApi: loginUser, error: apiError } = useDeferredApi(
    'loginUser',
    EMPTY_OBJ,
    {
      type: 'load',
      method: 'post',
      returnState: true,
      successMsg: 'Logged in successfully',
      onFetch,
    },
  );

  const disabled = fetching || isReloadingAfterAuth || authState === 'in';
  // todo: high/hard google/fb login
  return (
    <StackWrapInner title="Log In">
      <div className={styles.container}>
        {authState === 'in' && (
          <InfoBanner
            msg={isReloadingAfterAuth
              ? 'Logging in.'
              : (
                <>
                  {'Already logged in. '}
                  <Link
                    href={redirectPath ?? '/'}
                    blue
                  >
                    {redirectPath ? 'Go back' : 'Go to home'}
                  </Link>
                </>
              )}
            LeftSvg={isReloadingAfterAuth ? undefined : InfoSvg}
          />
        )}

        <Form
          onSubmit={handleSubmit(data => loginUser(data))}
          className={styles.form}
          data-testid={TestIds.loginForm}
        >
          <Input
            type="email"
            name="email"
            label="Email"
            register={register}
            registerOpts={{
              required: 'Email is required',
            }}
            disabled={disabled}
            autoFocus
          />

          <Input
            type="password"
            name="password"
            label="Password"
            register={register}
            registerOpts={{
              required: 'Password is required.',
              minLength: { value: 8, message: 'Password is incorrect.' },
              maxLength: { value: 64, message: 'Password is incorrect.' },
            }}
            disabled={disabled}
            placeholder="••••••••"
          />

          <HookFormErrors errors={errors} additionalError={apiError} />

          <Button
            Element="input"
            type="submit"
            value={fetching ? 'Logging In' : 'Log In'}
            fullWidth
            disabled={disabled}
          />
        </Form>

        <div className={styles.socialWrap}>
          <div className={styles.or}>or</div>
          <GoogleLoginButton
            type="login"
            onSubmitEmail={onSubmitEmail}
            onLogin={onFetch}
            onError={onError}
          />
          {detectPlatform().os === 'ios' && (
            <AppleLoginButton
              type="login"
              onSubmitEmail={onSubmitEmail}
              onLogin={onFetch}
              onError={onError}
            />
          )}
        </div>

        <p>
          <Link
            href={registerUrl}
            replace
          >
            Sign Up
          </Link>
        </p>
        <p>
          <Link
            href={selectedEmail.includes('@')
              ? `/resetpassword?email=${encodeURIComponent(selectedEmail)}`
              : '/resetpassword'}
          >
            Forgot Password?
          </Link>
        </p>
      </div>
    </StackWrapInner>
  );
});

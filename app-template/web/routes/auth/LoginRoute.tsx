import InfoSvg from 'svgs/fa5/info-circle-solid.svg';
import { useWatch } from 'react-hook-form';

import type ApiError from 'core/ApiError';
import RouteInner from 'core/frame/RouteInner';
import Form from 'components/form/Form';
import HookFormErrors from 'components/form/HookFormErrors';
import useLoginRedirectPathStorage from 'core/storage/useLoginRedirectPathStorage';
import { getPathFromState } from 'stores/history/historyStoreHelpers';
import InfoBanner from 'components/InfoBanner';
import GoogleLoginButton from 'components/buttons/GoogleLoginButton';
import detectPlatform from 'utils/detectPlatform';
import AppWebviewBanner from 'components/AppWebviewBanner';
import ServerStatusBanner from 'components/ServerStatusBanner';
import PasswordInput from 'components/form/PasswordInput';
import GooglePlayStoreButton from 'components/buttons/GooglePlayStoreButton';
import AppleAppStoreButton from 'components/buttons/AppleAppStoreButton';

import styles from './LoginRoute.scss';

const AppleLoginButton = reactLazy(() => import(
  /* webpackChunkName: 'AppleLoginButton' */ 'components/buttons/AppleLoginButton'
), null);

export default React.memo(function LoginRoute() {
  const query = useRouteQuery<'Login'>();
  const defaultEmail = query?.email;

  const {
    register,
    handleSubmit,
    setValue,
    control,
  } = useForm({
    mode: 'onBlur',
    defaultValues: {
      email: typeof defaultEmail === 'string' ? defaultEmail : '',
      password: '',
    },
  });
  const { errors } = useFormState({ control });
  // No idea why this might be undefined, from Sentry errors. Maybe Suspense
  const selectedEmail = useWatch({ name: 'email', control }) ?? '';

  const pushPath = usePushPath();
  const { authState, setAuth, isReloadingAfterAuth } = useAuthStore();
  const { backState } = useRouteStore();
  const [redirectPath, _, resetRedirectPath] = useLoginRedirectPathStorage(
    backState && backState.path !== '/login' && backState.path !== '/register'
      ? getPathFromState(backState)
      : undefined,
  );
  const { type: platform, os, webviewApp } = detectPlatform();

  const onSubmitEmail = useCallback((email: string) => {
    if (!selectedEmail.includes('@')) {
      setValue('email', email);
    }
  }, [selectedEmail, setValue]);
  const onFetch = useCallback((data: ApiData<'loginUser'>) => {
    EventLogger.track('Log In');

    resetRedirectPath();
    setAuth({
      authToken: data.authToken,
      userId: data.currentUserId,
      redirectPath: redirectPath ?? '/',
    });
  }, [resetRedirectPath, setAuth, redirectPath]);
  const on3PError = useCallback((err: ApiError) => {
    const email = (typeof err.data?.email === 'string' ? err.data?.email : null)
      ?? selectedEmail;
    if (err.status === 401 && email.includes('@')) {
      pushPath(buildPath<'Register'>('/register', { email: selectedEmail, did3pLogin: 1 }));
    } else {
      showToast({ msg: 'Failed to log in' });
    }
  }, [pushPath, selectedEmail]);

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

  const {
    email: emailError,
    password: passwordError,
    ...otherErrors
  } = errors;
  const disabled = fetching || isReloadingAfterAuth || authState === 'in';
  return (
    <RouteInner
      title="Log In"
      className={styles.container}
    >
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

      <AppWebviewBanner />

      <ServerStatusBanner />

      <Form
        onSubmit={handleSubmit(data => loginUser(data))}
        submitOnEnter
        className={styles.form}
        data-testid={TestIds.loginForm}
      >
        <Input
          type="email"
          name="email"
          label="Email"
          register={register}
          registerOpts={{
            required: 'Email is required.',
          }}
          error={emailError?.message}
          disabled={disabled}
          autoFocus
        />

        <PasswordInput
          name="password"
          label="Password"
          register={register}
          registerOpts={{
            required: 'Password is required.',
            minLength: { value: 8, message: 'Password is too short.' },
            maxLength: { value: 64, message: 'Password is too long.' },
          }}
          error={passwordError?.message}
          disabled={disabled}
          autoComplete="current-password"
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
          value={fetching ? 'Logging In' : 'Log In'}
          fullWidth
          disabled={disabled}
        />
      </Form>

      <div className={styles.socialWrap}>
        <div className={styles.or}>or</div>
        {detectPlatform().os === 'ios' && (
          <AppleLoginButton
            type="login"
            onSubmitEmail={onSubmitEmail}
            onLogin={onFetch}
            onError={on3PError}
          />
        )}
        <GoogleLoginButton
          type="login"
          onSubmitEmail={onSubmitEmail}
          onLogin={onFetch}
          onError={on3PError}
        />
      </div>

      <div className={styles.linksWrap}>
        <Link
          href={selectedEmail.includes('@')
            ? buildPath<'Register'>('/register', { email: selectedEmail })
            : '/register'}
          replace
          blue
        >
          Sign Up
        </Link>
        <Link
          href={selectedEmail.includes('@')
            ? buildPath<'ResetPassword'>('/resetpassword', { email: selectedEmail })
            : '/resetpassword'}
          blue
        >
          Reset Password
        </Link>
      </div>

      {!TS.includes([
        'android-native',
        'ios-native',
        'android-standalone',
        'ios-standalone',
      ] satisfies PlatformType[], platform)
          && !webviewApp
          && (
            <>
              {os === 'ios' || os === 'osx'
                ? <AppleAppStoreButton fullWidth className={styles.appBtn} />
                : <GooglePlayStoreButton fullWidth className={styles.appBtn} />}
              {os === 'ios' || os === 'osx'
                ? <GooglePlayStoreButton fullWidth className={styles.appBtn} />
                : <AppleAppStoreButton fullWidth className={styles.appBtn} />}
            </>
          )}
    </RouteInner>
  );
});

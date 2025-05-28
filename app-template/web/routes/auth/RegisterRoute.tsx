import InfoSvg from 'svgs/fa5/info-circle-solid.svg';
import dayjs from 'dayjs';
import { useWatch } from 'react-hook-form';

import Form from 'components/form/Form';
import RouteInner from 'core/frame/RouteInner';
import HookFormErrors from 'components/form/HookFormErrors';
import { MIN_USER_AGE, MAX_USER_AGE } from 'consts/coreUsers';
import useLoginRedirectPathStorage from 'core/storage/useLoginRedirectPathStorage';
import { getPathFromState } from 'stores/history/historyStoreHelpers';
import InfoBanner from 'components/InfoBanner';
import GoogleLoginButton from 'components/buttons/GoogleLoginButton';
import detectPlatform from 'utils/detectPlatform';
import GooglePlayStoreButton from 'components/buttons/GooglePlayStoreButton';
import AppleAppStoreButton from 'components/buttons/AppleAppStoreButton';
import ServerStatusBanner from 'components/ServerStatusBanner';
import AppWebviewBanner from 'components/AppWebviewBanner';
import PasswordInput from 'components/form/PasswordInput';
import getDeviceId from 'utils/getDeviceId';

import styles from './RegisterRoute.scss';

const AppleLoginButton = reactLazy(() => import(
  /* webpackChunkName: 'AppleLoginButton' */ 'components/buttons/AppleLoginButton'
), null);

// todo: mid/mid captcha for signing up
export default React.memo(function RegisterRoute() {
  const query = useRouteQuery<'Register'>();
  const defaultEmail = query?.email;
  const defaultName = query?.name;
  const backAfterRegister = query?.backAfterRegister !== undefined;
  const did3pLogin = query?.did3pLogin !== undefined;
  const { type: platform, os, webviewApp } = detectPlatform();

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
      name: typeof defaultName === 'string' ? defaultName : '',
      birthday: '',
    },
  });
  const { errors } = useFormState({ control });
  const { authState, setAuth, isReloadingAfterAuth } = useAuthStore();
  const { backState } = useRouteStore();
  useLoginRedirectPathStorage(
    backState && backState.path !== '/login' && backState.path !== '/register'
      ? getPathFromState(backState)
      : undefined,
  );
  const selectedEmail = useWatch({ name: 'email', control });
  const handleSubmitEmail = useCallback((email: string) => {
    if (selectedEmail.includes('@')) {
      setValue('email', email);
    }
  }, [selectedEmail, setValue]);
  const handleFetch = useCallback((data: ApiData<'registerUser'>) => {
    EventLogger.track('Register Account');

    setAuth({
      authToken: data.authToken,
      userId: data.currentUserId,
      redirectPath: backAfterRegister && backState
        ? getPathFromState(backState)
        : (data.isExisting
          ? `/user/${data.currentUserId}`
          : '/onboard?registered'),
      replace: true,
    });
  }, [setAuth, backAfterRegister, backState]);

  const { fetching, fetchApi: registerUser, error: apiError } = useDeferredApi(
    'registerUser',
    EMPTY_OBJ,
    {
      type: 'create',
      returnState: true,
      onFetch: handleFetch,
    },
  );

  const {
    email: emailError,
    password: passwordError,
    name: nameError,
    birthday: birthdayError,
    ...otherErrors
  } = errors;
  const disabled = fetching || isReloadingAfterAuth || authState === 'in';
  return (
    <RouteInner
      title="Sign Up"
      className={styles.container}
    >
      {authState === 'in' && (
        <InfoBanner
          msg={isReloadingAfterAuth
            ? 'Redirecting.'
            : (
              <>
                Already logged in.
                {' '}
                <Link
                  href="/"
                  blue
                >
                  Go to home
                </Link>
                {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
                {'.'}
              </>
            )}
          LeftSvg={isReloadingAfterAuth ? undefined : InfoSvg}
        />
      )}

      <ServerStatusBanner />

      <AppWebviewBanner />

      {!did3pLogin && (
        <>
          <GoogleLoginButton
            type="register"
            onSubmitEmail={handleSubmitEmail}
            onLogin={handleFetch}
          />
          {os === 'ios' && (
            <AppleLoginButton
              type="register"
              onSubmitEmail={handleSubmitEmail}
              onLogin={handleFetch}
            />
          )}
          <div className={styles.or}>
            <span>or</span>
          </div>
        </>
      )}

      <Form
        onSubmit={handleSubmit(data => {
          getDeviceId()
            .then(deviceId => {
              registerUser({
                email: data.email,
                password: data.password,
                name: data.name,
                birthday: dayjs(data.birthday).format('YYYY-MM-DD'),
                platform,
                deviceId,
              });
            })
            .catch(err => {
              ErrorLogger.warn(err, { ctx: 'registerUser' });
            });
        })}
        data-testid={TestIds.registerForm}
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
            minLength: { value: 8, message: 'Password needs to be at least 8 characters.' },
            maxLength: { value: 64, message: 'Password too long.' },
          }}
          error={passwordError?.message}
          disabled={disabled}
          autoComplete="off"
        />

        <Input
          type="name"
          name="name"
          label="Name"
          register={register}
          registerOpts={{
            required: 'Name is required.',
          }}
          error={nameError?.message}
          disabled={disabled}
          autoCapitalize="words"
        />
        <p className={styles.hint}>
          * Real name not required.
        </p>

        <Input
          type="date"
          name="birthday"
          label="Birthday"
          register={register}
          registerOpts={{
            required: 'Birthday is required.',
            validate(date) {
              const diffYears = dayjs().diff(date, 'year', true);
              if (diffYears < MIN_USER_AGE) {
                return `You must be at least ${MIN_USER_AGE} to join.`;
              }
              if (diffYears > MAX_USER_AGE) {
                return 'Invalid age.';
              }
              return true;
            },
          }}
          error={birthdayError?.message}
          disabled={disabled}
        />
        <p className={styles.hint}>
          * Only your age will be shown, your birthday is private.
        </p>

        <HookFormErrors
          control={control}
          errors={otherErrors}
          additionalError={apiError}
          marginBottom="2.5rem"
        />

        <Button
          Element="input"
          type="submit"
          value={fetching ? 'Signing Up' : 'Sign Up'}
          fullWidth
          overrides={{
            marginTop: '2rem',
            marginBottom: '1rem',
          }}
          disabled={disabled}
        />

        <p className={styles.tos}>
          By signing up, you agree to the
          {' '}
          <Link href="/tos/terms">Terms of Service</Link>
          {' '}
          and
          {' '}
          <Link href="/tos/privacy">Privacy Policy</Link>
          , including
          {' '}
          <Link href="/tos/cookie">Cookie Policy</Link>
          {/* eslint-disable-next-line react/jsx-curly-brace-presence */}
          {'.'}
        </p>
      </Form>

      <div className={styles.loginWrap}>
        <Link
          href={selectedEmail.includes('@')
            ? buildPath<'Login'>('/login', { email: selectedEmail })
            : '/login'}
          replace
          blue
        >
          Log In
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

import InfoSvg from 'svgs/fa5/info-circle-solid.svg';
import dayjs from 'dayjs';

import StackWrapInner from 'components/frame/stack/StackWrapInner';
import Form from 'components/common/Form';
import HookFormErrors from 'components/HookFormErrors';
import { MIN_USER_AGE, MAX_USER_AGE } from 'consts/coreUsers';
import useLoginRedirectPathStorage from 'hooks/storage/useLoginRedirectPathStorage';
import { getPathFromState } from 'stores/HistoryStore';
import { DEFAULT_DURATION } from 'hooks/useAnimation';
import InfoBanner from 'components/common/InfoBanner';
import GoogleLoginButton from 'components/buttons/GoogleLoginButton';
import detectPlatform from 'utils/detectPlatform';

import styles from './RegisterRoute.scss';

const AppleLoginButton = React.lazy(async () => import(
  /* webpackChunkName: 'AppleLoginButton' */ 'components/buttons/AppleLoginButton'
));

// todo: mid/mid captcha for signing up
export default React.memo(function RegisterRoute() {
  const query = useRouteQuery();
  const defaultEmail = query?.email;
  const defaultName = query?.name;
  const backAfterRegister = query?.backAfterRegister !== undefined;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
  } = useForm({
    reValidateMode: 'onBlur',
    defaultValues: {
      email: typeof defaultEmail === 'string' ? defaultEmail : '',
      password: '',
      name: typeof defaultName === 'string' ? defaultName : '',
      birthday: '',
    },
  });
  const { errors } = useFormState({ control });
  const { authState, setAuth, isReloadingAfterAuth } = useAuthStore();
  const { backState, isRouteActive } = useRouteStore();
  useLoginRedirectPathStorage(
    backState && backState.path !== '/login' && backState.path !== '/register'
      ? getPathFromState(backState)
      : undefined,
  );
  const selectedEmail = watch('email');
  const onSubmitEmail = useCallback((email: string) => {
    if (selectedEmail.includes('@')) {
      setValue('email', email);
    }
  }, [selectedEmail, setValue]);
  const onFetch = useCallback((data: ApiData<'registerUser'>) => {
    setAuth({
      authToken: data.authToken,
      userId: data.currentUserId,
      redirectPath: backAfterRegister
        ? undefined
        : '/onboard?registered',
    });
    if (isRouteActive && backAfterRegister) {
      window.history.back();
      setTimeout(() => {
        // @ts-ignore reload(true)
        window.location.reload(true);
      }, DEFAULT_DURATION);
    }
  }, [setAuth, backAfterRegister, isRouteActive]);

  const { fetching, fetchApi: registerUser, error: apiError } = useDeferredApi(
    'registerUser',
    EMPTY_OBJ,
    {
      type: 'create',
      returnState: true,
      onFetch,
    },
  );

  const disabled = fetching || isReloadingAfterAuth || authState === 'in';
  return (
    <StackWrapInner
      title="Sign Up"
    >
      <div className={styles.container}>
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
        <Form
          onSubmit={handleSubmit(data => {
            registerUser({
              email: data.email,
              password: data.password,
              name: data.name,
              birthday: dayjs(data.birthday).format('YYYY-MM-DD'),
            });
          })}
          className={styles.form}
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
            disabled={disabled}
            autoFocus
          />

          <Input
            type="password"
            name="password"
            label="Password"
            register={register}
            registerOpts={{
              required: 'Password is required',
              minLength: { value: 8, message: 'Password needs to be at least 8 characters.' },
              maxLength: { value: 64, message: 'Password too long.' },
            }}
            disabled={disabled}
            placeholder="••••••••"
          />

          <Input
            type="name"
            name="name"
            label="Name"
            register={register}
            registerOpts={{
              required: 'Name is required',
            }}
            disabled={disabled}
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
            disabled={disabled}
          />
          <p className={styles.hint}>
            * Only your age will be shown, your birthday is private.
          </p>

          <HookFormErrors errors={errors} additionalError={apiError} />

          <Button
            Element="input"
            type="submit"
            value={fetching ? 'Signing Up' : 'Sign Up'}
            fullWidth
            disabled={disabled}
          />
        </Form>

        <div className={styles.socialWrap}>
          <div className={styles.or}>or</div>
          <GoogleLoginButton
            type="register"
            onSubmitEmail={onSubmitEmail}
            onLogin={onFetch}
          />
          {detectPlatform().os === 'ios' && (
            <AppleLoginButton
              type="register"
              onSubmitEmail={onSubmitEmail}
              onLogin={onFetch}
            />
          )}
        </div>

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

        <p>
          <Link href="/login" replace>Log In</Link>
        </p>
      </div>
    </StackWrapInner>
  );
});

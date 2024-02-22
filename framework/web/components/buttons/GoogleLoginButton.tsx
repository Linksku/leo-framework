import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import GoogleSvg from 'svgs/google-icon.svg';

import ApiError from 'core/ApiError';
import { GOOGLE_CLIENT_ID_WEB } from 'config';
import useEffectInitialMount from 'hooks/useEffectInitialMount';
import ErrorBoundary from 'components/ErrorBoundary';
import detectPlatform from 'utils/detectPlatform';

import styles from './GoogleLoginButton.scss';

type Props = {
  type: 'login' | 'register',
  onSubmitEmail: Stable<(email: string) => void>,
  onLogin: Stable<(results: ApiData<'googleLoginUser'>) => void>,
  onError?: Stable<(err: ApiError) => void>,
};

function GoogleLoginButton({
  type,
  onSubmitEmail,
  onLogin,
  onError,
}: Props) {
  const [initialized, setInitialized] = useState(detectPlatform().isNative);
  const [signingIn, setSigningIn] = useState(false);
  const showToast = useShowToast();

  const { fetching, fetchApi: loginUser } = useDeferredApi(
    'googleLoginUser',
    EMPTY_OBJ,
    {
      type: 'create',
      returnState: true,
      onFetch: onLogin,
      onError,
    },
  );

  useEffectInitialMount(() => {
    if (!detectPlatform().isNative) {
      GoogleAuth.initialize({
        clientId: GOOGLE_CLIENT_ID_WEB,
        scopes: ['profile', 'email'],
      })
        .then(() => {
          setInitialized(true);
        })
        .catch(err => {
          ErrorLogger.warn(err, { ctx: 'GoogleAuth.initialize' });
        });
    }
  });

  const disabled = !initialized || signingIn || fetching;
  return (
    <Button
      LeftSvg={GoogleSvg}
      label={type === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
      onClick={async () => {
        setSigningIn(true);

        try {
          // @ts-ignore missing gapiLoaded type
          if (GoogleAuth.gapiLoaded) {
            // @ts-ignore missing gapiLoaded type
            await GoogleAuth.gapiLoaded;
          }

          const user = await GoogleAuth.signIn();
          // eslint-disable-next-line no-console
          console.log('Google login:', user);

          if (user.email) {
            onSubmitEmail(user.email);
          }
          loginUser({
            token: user.authentication.idToken,
            type,
          });
        } catch (err) {
          const errType = TS.isObj(err) && typeof err.error === 'string' ? err.error : null;
          const msg = `Failed to sign in with Google: ${errType ?? 'unknown error occurred'}`;
          if (errType !== 'popup_closed_by_user') {
            ErrorLogger.warn(err, {
              ctx: 'GoogleAuth.signIn',
              code: TS.isObj(err) ? TS.getProp(err, 'code') : undefined,
            });
          }
          showToast({ msg });
        }
        setSigningIn(false);
      }}
      overrides={{
        color: disabled ? '#999' : '#666',
        backgroundColor: '#fff',
        borderColor: '#ccc',
      }}
      className={styles.btn}
      leftSvgClassName={disabled ? styles.disabledSvg : undefined}
      disabled={disabled}
    />
  );
}

export default React.memo((props: Props) => (
  <ErrorBoundary>
    <GoogleLoginButton {...props} />
  </ErrorBoundary>
));

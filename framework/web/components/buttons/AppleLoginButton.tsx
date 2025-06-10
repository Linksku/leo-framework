import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import AppleSvg from 'svgs/fa5/brands/apple.svg';

import ApiError from 'core/ApiError';
import { APPLE_SERVICE_ID, APP_NAME } from 'config';
import { HOME_URL } from 'consts/server';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import useEffectInitialMount from 'utils/useEffectInitialMount';
import detectPlatform from 'utils/detectPlatform';
import { WEBVIEW_APP_LABEL } from 'utils/get3rdPartyWebviewFromUA';

import styles from './AppleLoginButton.scss';

type Props = {
  type: 'login' | 'register',
  onSubmitEmail: Stable<(email: string) => void>,
  onLogin: Stable<(results: ApiData<'appleLoginUser'>) => void>,
  onError?: Stable<(err: ApiError) => void>,
};

function AppleLoginButton({
  type,
  onSubmitEmail,
  onLogin,
  onError,
}: Props) {
  const [initialized, setInitialized] = useState(detectPlatform().isNative);
  const [signingIn, setSigningIn] = useState(false);
  const initErr = useRef<Error | null>(null);
  const ref = useRef({ name: '' });

  const { fetching, fetchApi: loginUser } = useDeferredApi(
    'appleLoginUser',
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
      // @ts-expect-error missing type
      (SignInWithApple.loadSignInWithAppleJS as () => Promise<void>)()
        .then(() => {
          setInitialized(true);
          initErr.current = null;
        })
        .catch(err => {
          ErrorLogger.warn(err, { ctx: 'SignInWithApple.loadSignInWithAppleJS' });

          if (err instanceof Error) {
            initErr.current = err;
          }
        });
    }
  });

  const disabled = !initialized || signingIn || fetching;
  return (
    <Button
      LeftSvg={AppleSvg}
      label={type === 'login' ? 'Sign in with Apple' : 'Sign up with Apple'}
      fullWidth
      onClick={async () => {
        const platform = detectPlatform();
        if (platform.webviewApp
          && !await showConfirm({
            title: `Continue in ${WEBVIEW_APP_LABEL[platform.webviewApp]}?`,
            msg: `${APP_NAME} is currently running inside another app. If Sign in with Apple fails, please try again in a browser.`,
            showCancel: true,
          })) {
          return;
        }

        if (disabled) {
          showToast({
            msg: initErr.current?.message
              ? `Failed to initialize Sign in with Apple: ${initErr.current.message}`
              : 'Failed to initialize Sign in with Apple',
          });
          return;
        }

        setSigningIn(true);

        try {
          // response can be missing email, but email is in jwt
          const { response } = await SignInWithApple.authorize({
            clientId: APPLE_SERVICE_ID,
            redirectURI: HOME_URL + (type === 'login' ? '/login' : '/register'),
            scopes: 'email name',
            state: 'state',
            nonce: 'nonce',
          });
          // eslint-disable-next-line no-console
          console.log('Apple login:', response);

          if (response.email) {
            onSubmitEmail(response.email ?? '');
          }
          // Name is available only the first time user logs in
          ref.current.name ||= TS.filterNulls([response.givenName, response.familyName]).join(' ');
          loginUser({
            type,
            name: ref.current.name,
            jwt: response.identityToken,
          });
        } catch (err) {
          const msg = err instanceof Error
            ? err.message
            : (TS.isObj(err) && typeof err.error === 'string' ? err.error : null);
          if (!msg?.includes('user canceled the sign-in flow')) {
            ErrorLogger.warn(
              err instanceof Error || !msg ? err : new Error(msg),
              { ctx: 'SignInWithApple.authorize' },
            );
          }

          if (msg) {
            showToast({ msg });
          }
        }
        setSigningIn(false);
      }}
      overrides={{
        color: disabled ? '#999' : '#666',
        backgroundColor: '#fff',
        borderColor: '#ccc',
      }}
      className={styles.btn}
    />
  );
}

export default React.memo((props: Props) => (
  <ErrorBoundary>
    <AppleLoginButton {...props} />
  </ErrorBoundary>
));

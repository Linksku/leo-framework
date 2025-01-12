import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import GoogleSvg from 'svgs/google-icon.svg';

import ApiError from 'core/ApiError';
import {
  APP_NAME,
  GOOGLE_CLIENT_ID_WEB,
} from 'config';
import useEffectInitialMount from 'utils/useEffectInitialMount';
import ErrorBoundary from 'core/frame/ErrorBoundary';
import detectPlatform from 'utils/detectPlatform';
import { WEBVIEW_APP_LABEL } from 'utils/get3rdPartyWebviewFromUA';
import useUpdate from 'utils/useUpdate';

import styles from './GoogleLoginButton.scss';

let isInitializing = false;
let isInitialized = false;

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
  const forceUpdate = useUpdate();
  const [signingIn, setSigningIn] = useState(false);
  const initErr = useRef<Error | null>(null);

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
    if (process.env.SERVER === 'production' && !isInitialized && !isInitializing) {
      isInitializing = true;

      GoogleAuth.initialize({
        // Native apps use IDs from capacitor.config.js
        clientId: detectPlatform().isNative ? undefined : GOOGLE_CLIENT_ID_WEB,
        scopes: ['profile', 'email'],
      })
        .then(() => {
          isInitializing = false;
          isInitialized = true;

          initErr.current = null;
          forceUpdate();
        })
        .catch(err => {
          ErrorLogger.warn(err, { ctx: 'GoogleAuth.initialize' });

          isInitializing = false;
          isInitialized = false;

          if (err instanceof Error) {
            initErr.current = err;
          }
          forceUpdate();
        });
    }
  });

  const disabled = !isInitialized || signingIn || fetching;
  return (
    <Button
      LeftSvg={GoogleSvg}
      leftSvgOverrides={{
        opacity: disabled ? '0.7' : undefined,
      }}
      label={type === 'login' ? 'Sign in with Google' : 'Sign up with Google'}
      onClick={async () => {
        const platform = detectPlatform();
        if (platform.webviewApp
          && !await showConfirm({
            title: `Continue in ${WEBVIEW_APP_LABEL[platform.webviewApp]}?`,
            msg: `${APP_NAME} is currently running inside another app. If Sign in with Google fails, please try again in a browser.`,
            showCancel: true,
          })) {
          return;
        }

        if (disabled) {
          showToast({
            msg: initErr.current?.message
              ? `Failed to initialize Sign in with Google: ${initErr.current.message}`
              : 'Failed to initialize Sign in with Google',
          });
          return;
        }

        setSigningIn(true);

        try {
          // @ts-expect-error missing gapiLoaded type
          if (GoogleAuth.gapiLoaded) {
            // @ts-expect-error missing gapiLoaded type
            await GoogleAuth.gapiLoaded;
          }

          try {
            // Prevents auto-selecting the last account used
            await GoogleAuth.signOut();
          } catch {}

          const user = await GoogleAuth.signIn();
          // eslint-disable-next-line no-console
          console.log('Google login:', user);

          if (user.email) {
            onSubmitEmail(user.email ?? '');
          }
          loginUser({
            token: user.authentication.idToken,
            type,
          });
        } catch (err) {
          const errType = TS.isObj(err) && typeof err.error === 'string' ? err.error : null;
          const msg = `Failed to sign in with Google: ${
            errType
              ?? (err instanceof Error ? err.message : null)
              ?? 'unknown error occurred'
          }`;
          if (errType !== 'popup_closed_by_user') {
            ErrorLogger.warn(
              errType ? new Error(msg) : err,
              {
                ctx: 'GoogleAuth.signIn',
                code: TS.isObj(err) ? TS.getProp(err, 'code') : undefined,
              },
            );
            showToast({ msg });
          }
        }
        setSigningIn(false);
      }}
      fullWidth
      overrides={{
        color: disabled ? '#999' : '#666',
        backgroundColor: '#fff',
        borderColor: '#ccc',
        marginBottom: '1.5rem',
      }}
      className={styles.btn}
    />
  );
}

export default React.memo((props: Props) => (
  <ErrorBoundary>
    <GoogleLoginButton {...props} />
  </ErrorBoundary>
));

import { SignInWithApple } from '@capacitor-community/apple-sign-in';
import AppleSvg from 'svgs/fa5/apple-brands.svg';

import ApiError from 'core/ApiError';
import { APPLE_SERVICE_ID } from 'config';
import { HOME_URL } from 'consts/server';
import ErrorBoundary from 'components/ErrorBoundary';
import useEffectInitialMount from 'hooks/useEffectInitialMount';
import detectPlatform from 'utils/detectPlatform';

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
  const showToast = useShowToast();
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
      // @ts-ignore missing type
      (SignInWithApple.loadSignInWithAppleJS as () => Promise<void>)()
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
      LeftSvg={AppleSvg}
      label={type === 'login' ? 'Sign in with Apple' : 'Sign up with Apple'}
      onClick={async () => {
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
            onSubmitEmail(response.email);
          }
          // Name is available only the first time user logs in
          ref.current.name ||= TS.filterNulls([response.givenName, response.familyName]).join(' ');
          loginUser({
            type,
            name: ref.current.name,
            jwt: response.identityToken,
          });
        } catch (err) {
          ErrorLogger.warn(err, { ctx: 'SignInWithApple.authorize' });
          if (err instanceof Error) {
            showToast({ msg: err.message });
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
      disabled={disabled}
    />
  );
}

export default React.memo((props: Props) => (
  <ErrorBoundary>
    <AppleLoginButton {...props} />
  </ErrorBoundary>
));

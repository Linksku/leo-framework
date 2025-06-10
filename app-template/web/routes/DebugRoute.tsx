import ArrowSvg from 'svgs/fa5/regular/arrow-right.svg';
import LoginSvg from 'svgs/fa5/regular/sign-in-alt.svg';
import dayjs from 'dayjs';

import RouteInner from 'core/frame/RouteInner';
import { PROD_DOMAIN_NAME } from 'config/config';
import useLoggedInAsStorage from 'core/storage/useLoggedInAsStorage';
import useDebugLog from 'core/globalState/useDebugLog';

import styles from './DebugRoute.scss';

// todo: low/easy move ngrok url to config
const DEFAULT_DEV_URL = 'https://amused-grown-bluebird.ngrok-free.app';

export default function DebugRoute() {
  const [showDevUrl, setShowDevUrl] = useState(false);
  const [devUrl, setDevUrl] = useState(DEFAULT_DEV_URL);
  const [loginAsUserId, setLoginAsUserId] = useState<number | null>(null);
  const { setAuth, isReloadingAfterAuth } = useAuthStore();
  const [_, setLoggedInAs] = useLoggedInAsStorage();
  const [debugLog] = useDebugLog();

  const { fetchApi: loginAs, fetching: loggingIn } = useDeferredApi(
    'loginAsUser',
    EMPTY_OBJ,
    {
      type: 'load',
      method: 'post',
      successMsg: 'Logged in successfully',
      onFetch(data) {
        setLoggedInAs(data.currentUserId);
        setAuth({
          authToken: data.authToken,
          userId: data.currentUserId,
          redirectPath: `/user/${data.currentUserId}`,
          replace: true,
        });
      },
      returnState: true,
    },
  );

  return (
    <RouteInner
      title="Debug"
      className={styles.container}
    >
      <div
        className={cx(styles.topWrap, {
          [styles.withDebugLog]: debugLog.length > 0,
        })}
      >
        <div className={styles.envBtns}>
          <Button
            label="Prod"
            href={'https://' + PROD_DOMAIN_NAME}
          />
          <Button
            label="Dev"
            onClick={() => setShowDevUrl(true)}
          />
        </div>
        {showDevUrl && (
          <div>
            <Input
              type="text"
              defaultValue={DEFAULT_DEV_URL}
              onChange={e => setDevUrl(e.target.value)}
              SuffixSvg={ArrowSvg}
              suffixProps={{
                onClick() {
                  window.open(devUrl, '_blank');
                },
              }}
            />
          </div>
        )}

        <h2 className={styles.sectionTitle}>Login as user</h2>
        <Input
          type="text"
          onChange={e => setLoginAsUserId(TS.parseIntOrNull(e.target.value))}
          SuffixSvg={LoginSvg}
          suffixProps={{
            onClick() {
              if (!isReloadingAfterAuth && !loggingIn) {
                loginAs({ userId: TS.notNull(loginAsUserId) });
              }
            },
          }}
        />
      </div>

      {debugLog.length > 0 && (
        <div className={styles.debugLog}>
          {debugLog.map((item, idx) => (
            // eslint-disable-next-line react/no-array-index-key
            <p key={idx}>
              {`[${dayjs(item.time).format('HH:mm:ss')}] ${item.msg}`}
            </p>
          )).reverse()}
        </div>
      )}
    </RouteInner>
  );
}

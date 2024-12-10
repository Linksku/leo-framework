import AppleAppStoreButton from 'components/buttons/AppleAppStoreButton';
import GooglePlayStoreButton from 'components/buttons/GooglePlayStoreButton';
import detectPlatform from 'utils/detectPlatform';
import InfoBanner from 'components/InfoBanner';
import { WEBVIEW_APP_LABEL } from 'utils/get3rdPartyWebviewFromUA';

import styles from './AppWebviewBanner.scss';

export default function AppWebviewBanner(props: Partial<Parameters<typeof InfoBanner>[0]>) {
  const { os, webviewApp } = detectPlatform();

  if (!webviewApp) {
    return null;
  }
  return (
    <InfoBanner
      msg={(
        <div className={styles.inner}>
          <p className={styles.msg}>
            {`Currently inside ${WEBVIEW_APP_LABEL[webviewApp]}. For the best experience, open in a browser or download the app.`}
          </p>
          <div className={styles.appBtns}>
            {os === 'ios' || os === 'osx'
              ? <AppleAppStoreButton className={styles.appBtn} />
              : <GooglePlayStoreButton className={styles.appBtn} />}
            {os === 'ios' || os === 'osx'
              ? <GooglePlayStoreButton className={styles.appBtn} />
              : <AppleAppStoreButton className={styles.appBtn} />}
          </div>
        </div>
      )}
      isWarning
      {...props}
    />
  );
}

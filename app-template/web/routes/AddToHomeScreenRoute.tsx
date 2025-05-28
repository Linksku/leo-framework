import RouteInner from 'core/frame/RouteInner';
import { APP_NAME } from 'config';
import { DOMAIN_NAME } from 'consts/server';
import detectBrowser from 'utils/detectBrowser';

import styles from './AddToHomeScreenRoute.scss';

export default function AddToHomeScreenRoute() {
  const platform = navigator.userAgentData?.platform ?? navigator.platform;
  const isIOS = ['iPhone', 'iPod', 'iPad'].includes(platform);
  const isSafari = isIOS && detectBrowser() === 'safari';

  const iosInstructions = (
    <React.Fragment key="ios">
      <h2>iOS</h2>
      <ol>
        {!isSafari && (
          <li>{`Open ${DOMAIN_NAME} in Safari`}</li>
        )}
        <li>Tap the &quot;Share&quot; icon at the bottom</li>
        <li>Select &quot;Add to Home Screen&quot;</li>
      </ol>
    </React.Fragment>
  );
  const androidInstructions = (
    <React.Fragment key="android">
      <h2>Android</h2>
      <ol>
        <li>Open your browser&apos;s &quot;more&quot; menu</li>
        <li>Select &quot;Add to Home Screen&quot; or &quot;Install App&quot;</li>
      </ol>
    </React.Fragment>
  );
  return (
    <RouteInner
      title="Add to Home Screen"
      className={styles.container}
    >
      <p>{`Instead of installing the ${APP_NAME} Android or iOS app, you can add a shortcut to ${DOMAIN_NAME} on your home screen.`}</p>
      {isIOS
        ? [iosInstructions, androidInstructions]
        : [androidInstructions, iosInstructions]}
    </RouteInner>
  );
}

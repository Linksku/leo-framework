import detectPlatform from 'utils/detectPlatform';
import BackButtonHandler from './BackButtonHandler';
import EntityEventHandlers from './EntityEventHandlers';
import FcmBroadcastHandler from './FcmBroadcastHandler';
import NativePushNotifHandler from './NativePushNotifHandler';
import RegisterPushNotifsHandler from './RegisterPushNotifsHandler';
import TapToExitHandler from './TapToExitHandler';

export default React.memo(function EventHandlers() {
  return (
    <>
      <BackButtonHandler />
      <TapToExitHandler />
      <EntityEventHandlers />
      <RegisterPushNotifsHandler />
      {!detectPlatform().isNative && <FcmBroadcastHandler />}
      {detectPlatform().isNative && <NativePushNotifHandler />}
    </>
  );
});

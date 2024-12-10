import detectPlatform from 'utils/detectPlatform';
import PrependHomeToHistoryHandler from './PrependHomeToHistoryHandler';
import BackButtonHandler from './BackButtonHandler';
import ClickEventHandler from './ClickEventHandler';
import EntityEventHandlers from './EntityEventHandlers';
import FcmBroadcastHandler from './FcmBroadcastHandler';
import NativePushNotifHandler from './NativePushNotifHandler';
import NotifsHandlers from './NotifsHandlers';
import PopstateEventHandler from './PopstateEventHandler';
import RefetchApiHandlers from './RefetchApiHandlers';
import RegisterPushNotifsHandler from './RegisterPushNotifsHandler';
import TapToExitHandler from './TapToExitHandler';
import VisibilityChangeHandler from './VisibilityChangeHandler';
import WindowSizeHandler from './WindowSizeHandler';

export default React.memo(function EventHandlers() {
  return (
    <>
      <PrependHomeToHistoryHandler />
      <BackButtonHandler />
      <ClickEventHandler />
      <EntityEventHandlers />
      <NotifsHandlers />
      <PopstateEventHandler />
      <RefetchApiHandlers />
      <RegisterPushNotifsHandler />
      <TapToExitHandler />
      <VisibilityChangeHandler />
      <WindowSizeHandler />
      {!detectPlatform().isNative && <FcmBroadcastHandler />}
      {detectPlatform().isNative && <NativePushNotifHandler />}
    </>
  );
});

import type MixpanelType from 'mixpanel-browser';
import detectPlatform from 'utils/detectPlatform';

import { MIXPANEL_TOKEN } from 'config/config';
import { requestIdleCallback } from 'utils/requestIdleCallback';
import { HOME_URL } from 'consts/server';
import retryImport from 'utils/retryImport';

type EventProps = ObjectOf<string | number | boolean | null>;

let Mixpanel: typeof MixpanelType | null = null;
const queuedEvents: {
  eventName: string,
  eventProps?: EventProps,
}[] = [];

const EventLogger = {
  // todo: low/easy maybe api to relay tracking
  track(eventName: string, eventProps?: EventProps) {
    if (!process.env.PRODUCTION
      && !/^[A-Z]/.test(eventName)) {
      ErrorLogger.warn(new Error(`EventLogger.track(${eventName}): invalid name`));
    }

    if (Mixpanel) {
      requestIdleCallback(() => {
        (Mixpanel as typeof MixpanelType).track(eventName, eventProps);
      }, { timeout: 1000 });
    } else {
      queuedEvents.push({ eventName, eventProps });
    }
  },
};

let latestUser: Entity<'user'> | null = null;

export function setEventLoggerUser(user: Entity<'user'> | null): void {
  latestUser = user;

  if (user && Mixpanel) {
    Mixpanel.identify(user.id.toString());
  }
}

export function clearEventLoggerUser(): void {
  latestUser = null;
  Mixpanel?.reset();
}

export function loadEventLogger(user: Entity<'user'> | null): void {
  latestUser = user;

  retryImport(() => import(/* webpackChunkName: 'Mixpanel' */ 'mixpanel-browser'))
    .then(module => {
      Mixpanel = module.default;

      return new Promise(succ => {
        TS.notNull(Mixpanel).init(MIXPANEL_TOKEN, {
          persistence: 'localStorage',
          loaded: succ,
        });
      });
    })
    .then(() => {
      if (latestUser) {
        TS.notNull(Mixpanel).identify(latestUser.id.toString());
        TS.notNull(Mixpanel).people.set({
          $name: latestUser.name,
          $avatar: TS.getProp(latestUser, 'photoUrl') ?? null,
          URL: `${HOME_URL}/user/${latestUser.id}`,
        });
      }

      const platform = detectPlatform();
      const props: EventProps = {
        'JS Version': process.env.JS_VERSION,
        Language: window.navigator.language,
        'Platform OS': platform.os,
        'Platform Type': platform.type,
      };
      if (platform.webviewApp) {
        props['Platform 3rd Party Webview'] = platform.webviewApp;
      }
      TS.notNull(Mixpanel).register(props);

      requestIdleCallback(() => {
        for (const event of queuedEvents) {
          EventLogger.track(event.eventName, event.eventProps);
        }
      }, { timeout: 1000 });
    })
    .catch(err => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
}

export default EventLogger;

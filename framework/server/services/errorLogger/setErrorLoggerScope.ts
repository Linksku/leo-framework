import type { Scope } from '@sentry/types';
import { inspect } from 'util';

import getOsFromUa from 'utils/getOsFromUa';
import getServerId from 'core/getServerId';
import BullQueueContextLocalStorage, { BullQueueContext } from 'services/BullQueueContextLocalStorage';
import ServiceContextLocalStorage, { ServiceContext } from 'services/ServiceContextLocalStorage';

function setRequestContextScope(scope: Scope, rc: RequestContext) {
  const currentUserId = rc?.currentUserId;
  const userAgent = rc?.userAgent;
  const os = rc?.os ?? getOsFromUa(userAgent);
  const platform = rc?.platform;
  const language = rc?.language;
  const path = rc?.path;
  const params = rc?.apiParams;

  if (currentUserId) {
    scope.setUser({ id: currentUserId?.toString() });
  }
  scope.setTag('environment', process.env.NODE_ENV);
  scope.setTag('server', process.env.SERVER);
  scope.setTag('userId', currentUserId);
  scope.setTag('jsVersion', process.env.JS_VERSION);
  scope.setTag('serverId', getServerId());
  scope.setTag('callsite', 'server');

  scope.setTag('userAgent', userAgent);
  scope.setTag('os', os);
  scope.setTag('platform', platform);
  scope.setTag('language', language);
  scope.setTag('path', path);

  if (params) {
    for (const [k, v] of TS.objEntries(params)) {
      scope.setTag(
        `param:${k}`,
        TS.isObj(v)
          ? inspect(v).slice(0, 1000)
          : v as Primitive,
      );
    }
  }
}

function setBullQueueContextScope(
  scope: Scope,
  {
    queueName,
    jobName,
    data,
  }: BullQueueContext,
) {
  scope.setTag('queueName', queueName);
  scope.setTag('jobName', jobName);

  if (data) {
    for (const [k, v] of TS.objEntries(data)) {
      if (v && typeof v !== 'object') {
        scope.setTag(
          `data:${k}`,
          v as Primitive,
        );
      }
    }
  }
}

function setServiceContextScope(
  scope: Scope,
  {
    serviceName,
    data,
  }: ServiceContext,
) {
  scope.setTag('serviceName', serviceName);

  if (data) {
    for (const [k, v] of TS.objEntries(data)) {
      if (v && typeof v !== 'object') {
        scope.setTag(
          `data:${k}`,
          v as Primitive,
        );
      }
    }
  }
}

export default function setErrorLoggerScope(scope: Scope) {
  const rc = getRC();
  if (rc) {
    setRequestContextScope(scope, rc);
    return;
  }

  const bullQueueContext = BullQueueContextLocalStorage.getStore();
  if (bullQueueContext) {
    setBullQueueContextScope(scope, bullQueueContext);
    return;
  }

  const serviceContext = ServiceContextLocalStorage.getStore();
  if (serviceContext) {
    setServiceContextScope(scope, serviceContext);
    return;
  }

  if (!process.env.PRODUCTION) {
    printDebug('Error logger doesn\'t have any context', 'warn');
  }
}

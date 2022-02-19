import type { Scope } from '@sentry/types';
import { inspect } from 'util';

import detectOs from 'lib/detectOs';
import isOsMobile from 'lib/isOsMobile';
import getServerId from 'lib/getServerId';
import BullQueueContextLocalStorage from 'services/BullQueueContextLocalStorage';

function setRequestContextScope(scope: Scope, rc: RequestContext) {
  const currentUserId = rc?.currentUserId;
  const userAgent = rc?.userAgent;
  const os = rc?.os ?? detectOs(userAgent);
  const language = rc?.language;
  const path = rc?.path;
  const params = rc?.apiParams;

  scope.setUser({ id: currentUserId?.toString() });
  scope.setTag('userId', currentUserId);
  scope.setTag('jsVersion', process.env.JS_VERSION);
  scope.setTag('serverId', getServerId());
  scope.setTag('callsite', 'server');

  scope.setTag('userAgent', userAgent);
  scope.setTag('os', os);
  scope.setTag('isMobile', isOsMobile(os));
  scope.setTag('language', language);
  scope.setTag('path', path);

  if (params) {
    for (const [k, v] of TS.objEntries(params)) {
      scope.setTag(
        `param:${k}`,
        v && typeof v === 'object'
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

  if (process.env.NODE_ENV !== 'production') {
    printDebug(new Error('Error logger doesn\'t have any context'));
  }
}

import getModelDataLoader from 'services/dataLoader/getModelDataLoader';
import { API_POST_TIMEOUT } from 'settings';
import waitForKafkaSinkMsg from 'utils/models/waitForKafkaSinkMsg';

// Check if change has propagated through MZ to RR
export default async function waitForModelRRUpdate<
  T extends ModelClass,
  P extends ModelPartialExact<T, P>,
  Obj extends ModelPartialExact<T, Obj>,
>(
  Model: T,
  partial: P,
  update: Obj,
  {
    retryInterval = 300,
    timeout = API_POST_TIMEOUT / 2,
    throwIfTimeout = false,
    timeoutErrMsg = '',
  } = {},
) {
  if (!process.env.PRODUCTION && !Model.getReplicaTable()) {
    throw new Error(`waitForModelRRUpdate: ${Model.name} isn't in RR.`);
  }
  const startTime = performance.now();

  try {
    await waitForKafkaSinkMsg(Model.type, partial, { timeout });
  } catch (err) {
    if (err instanceof Error && err.message.includes('timed out')) {
      if (timeoutErrMsg) {
        throw new UserFacingError(timeoutErrMsg, 503, { err });
      }
      if (throwIfTimeout) {
        throw err;
      }
      return;
    }
    throw err;
  }

  let lastErr: string | null = null;
  for (let i = 0; i < timeout / retryInterval; i++) {
    lastErr = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      const instance = await getModelDataLoader(Model).load(partial);
      if (instance && TS.objEntries(update).every(
        ([key, val]) => (val && typeof val === 'object'
          // @ts-ignore model key
          ? JSON.stringify(val) === JSON.stringify(instance[key])
          // @ts-ignore model key
          : val === instance[key]),
      )) {
        return;
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : 'Non-error was thrown.';
    }

    if (performance.now() - startTime >= timeout - retryInterval) {
      if (timeoutErrMsg) {
        throw new UserFacingError(timeoutErrMsg, 503, { lastErr });
      }
      if (throwIfTimeout) {
        throw getErr('waitForModelRRUpdate: timed out', { lastErr });
      }
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(retryInterval);
  }

  throw getErr('waitForModelRRUpdate: reached end of loop', { lastErr });
}

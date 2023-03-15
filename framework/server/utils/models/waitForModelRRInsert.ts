import getModelDataLoader from 'services/dataLoader/getModelDataLoader';
import { API_POST_TIMEOUT } from 'settings';

// todo: mid/mid subscribe to kafka sink topic instead of polling
export default async function waitForModelRRInsert<
  T extends ModelClass,
  P extends ModelPartialExact<T, P>,
>(
  Model: T,
  partial: P,
  {
    retryInterval = 500,
    // todo: low/mid default to remaining api time
    timeout = API_POST_TIMEOUT / 2,
    throwIfTimeout = false,
    timeoutErrMsg = '',
  } = {},
) {
  if (!process.env.PRODUCTION && !Model.getReplicaTable()) {
    throw new Error(`waitForModelRRInsert: ${Model.name} isn't in RR.`);
  }

  const startTime = performance.now();
  let lastErr: string | null = null;

  for (let i = 0; i < 100; i++) {
    lastErr = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      const instance = await getModelDataLoader(Model).load(partial);
      if (instance) {
        return;
      }
    } catch (err) {
      lastErr = err instanceof Error ? err.message : 'Non-error was thrown.';
    }

    if (performance.now() - startTime >= timeout - retryInterval) {
      if (throwIfTimeout) {
        throw timeoutErrMsg
          ? new UserFacingError(timeoutErrMsg, 503, { lastErr })
          : getErr('waitForModelRRInsert: timed out', { lastErr });
      }
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(retryInterval);
  }

  throw getErr('waitForModelRRInsert: reached end of loop', { lastErr });
}

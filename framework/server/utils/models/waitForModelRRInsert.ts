import getModelDataLoader from 'services/dataLoader/getModelDataLoader';
import { API_POST_TIMEOUT } from 'settings';
import waitForKafkaSinkMsg from 'utils/models/waitForKafkaSinkMsg';

// todo: mid/mid subscribe to kafka sink topic instead of polling
export default async function waitForModelRRInsert<
  T extends ModelClass,
  P extends ModelPartialExact<T, P>,
>(
  Model: T,
  partial: P,
  {
    retryInterval = 300,
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
      if (instance) {
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
        throw getErr('waitForModelRRInsert: timed out', { lastErr });
      }
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(retryInterval);
  }

  throw getErr('waitForModelRRInsert: reached end of loop', { lastErr });
}

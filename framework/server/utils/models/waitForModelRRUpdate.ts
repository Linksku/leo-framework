import getModelDataLoader from 'services/dataLoader/getModelDataLoader';
import MaterializedView from 'services/model/MaterializedView';
import RequestContextLocalStorage from 'services/requestContext/RequestContextLocalStorage';
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
    timeout = 5000,
    throwIfTimeout = false,
    timeoutErrMsg = '',
    otherErrMsg = '',
  } = {},
) {
  if (!process.env.PRODUCTION && !Model.getReplicaTable()) {
    throw new Error(`waitForModelRRUpdate: ${Model.name} isn't in RR.`);
  }
  const startTime = performance.now();

  if (Model.prototype instanceof MaterializedView && Model.getReplicaTable()) {
    try {
      await waitForKafkaSinkMsg(
        Model.type,
        partial,
        { timeout: timeout / 2 },
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes('didn\'t receive first message')) {
        // pass
      } else if (err instanceof Error && err.message.includes('timed out')) {
        if (timeoutErrMsg) {
          throw new UserFacingError(timeoutErrMsg, 503, { err });
        }
        if (throwIfTimeout) {
          throw err;
        }

        ErrorLogger.warn(new Error(
          `waitForModelRRUpdate(${Model.name}): waitForKafkaSinkMsg timed out`,
        ));
        return;
      } else if (otherErrMsg) {
        throw new UserFacingError(otherErrMsg, 503, { err });
      } else {
        throw err;
      }
    }
  }

  let lastErr: any = null;
  for (let i = 0; i < timeout / retryInterval; i++) {
    lastErr = null;
    try {
      // eslint-disable-next-line no-await-in-loop
      const instance = await RequestContextLocalStorage.exit(
        () => getModelDataLoader(Model).load(partial),
      );
      if (instance && TS.objEntries(update).every(
        ([key, val]) => (TS.isObj(val)
          // @ts-ignore model key
          ? JSON.stringify(val) === JSON.stringify(instance[key])
          // @ts-ignore model key
          : val === instance[key]),
      )) {
        return;
      }
    } catch (err) {
      lastErr = err;
    }

    if (performance.now() - startTime >= timeout - retryInterval) {
      if (lastErr) {
        if (otherErrMsg) {
          throw new UserFacingError(otherErrMsg, 503, { lastErr });
        }
        throw lastErr;
      }
      if (timeoutErrMsg) {
        throw new UserFacingError(timeoutErrMsg, 503, { lastErr });
      }
      if (throwIfTimeout) {
        throw new Error('waitForModelRRUpdate: RR timed out');
      }

      ErrorLogger.warn(new Error(
        `waitForModelRRUpdate(${Model.name}): RR timed out`,
      ));
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(retryInterval);
  }

  throw getErr('waitForModelRRUpdate: reached end of loop', { lastErr });
}

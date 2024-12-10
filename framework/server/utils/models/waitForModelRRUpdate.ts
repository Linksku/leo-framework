import getModelDataLoader from 'services/dataLoader/getModelDataLoader';
import MaterializedView from 'core/models/MaterializedView';
import RequestContextLocalStorage from 'core/requestContext/RequestContextLocalStorage';
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
    waitForSink = false,
  } = {},
) {
  if (!process.env.PRODUCTION && !Model.getReplicaTable()) {
    throw new Error(`waitForModelRRUpdate: ${Model.name} isn't in RR.`);
  }
  const startTime = performance.now();

  if (waitForSink && TS.extends(Model, MaterializedView) && Model.getReplicaTable()) {
    try {
      await waitForKafkaSinkMsg(
        Model.type,
        partial,
        { timeout },
      );
    } catch (err) {
      if (err instanceof Error && err.message.includes('didn\'t receive first message')) {
        // pass
      } else if (err instanceof Error && err.message.includes('timed out')) {
        if (timeoutErrMsg) {
          throw new UserFacingError(
            timeoutErrMsg,
            {
              status: 503,
              debugCtx: { err },
            },
          );
        }
        if (throwIfTimeout) {
          throw err;
        }

        ErrorLogger.warn(new Error(
          `waitForModelRRUpdate(${Model.name}): waitForKafkaSinkMsg timed out`,
        ));
        return;
      } else if (otherErrMsg) {
        throw new UserFacingError(
          otherErrMsg,
          {
            status: 503,
            debugCtx: { err },
          },
        );
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
          // @ts-expect-error model key
          ? JSON.stringify(val) === JSON.stringify(instance[key])
          // @ts-expect-error model key
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
          throw new UserFacingError(
            otherErrMsg,
            {
              status: 503,
              debugCtx: { lastErr },
            },
          );
        }
        throw lastErr;
      }
      if (timeoutErrMsg) {
        throw new UserFacingError(
          timeoutErrMsg,
          {
            status: 503,
            debugCtx: { lastErr },
          },
        );
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

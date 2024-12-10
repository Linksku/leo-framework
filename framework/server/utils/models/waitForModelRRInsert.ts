import getModelDataLoader from 'services/dataLoader/getModelDataLoader';
import MaterializedView from 'core/models/MaterializedView';
import RequestContextLocalStorage from 'core/requestContext/RequestContextLocalStorage';
import waitForKafkaSinkMsg from 'utils/models/waitForKafkaSinkMsg';

export default async function waitForModelRRInsert<
  T extends ModelClass,
  P extends ModelPartialExact<T, P>,
>(
  Model: T,
  partial: P,
  {
    retryInterval = 300,
    timeout = 5000,
    throwIfTimeout = false,
    timeoutErrMsg = '',
    otherErrMsg = '',
    /* Temporarily disable waitForKafkaSinkMsg because:
    - could be called after msg arrive
    - first message is slow
    - when recreating MZ, Node receives too many messagess
    */
    waitForSink = false,
  } = {},
) {
  if (!process.env.PRODUCTION && !Model.getReplicaTable()) {
    throw new Error(`waitForModelRRInsert: ${Model.name} isn't in RR.`);
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
          `waitForModelRRInsert(${Model.name}): waitForKafkaSinkMsg timed out`,
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
      if (instance) {
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
        throw new UserFacingError(timeoutErrMsg, 503);
      }
      if (throwIfTimeout) {
        throw new Error('waitForModelRRInsert: RR timed out');
      }

      ErrorLogger.warn(new Error(
        `waitForModelRRInsert(${Model.name}): RR timed out`,
      ));
      return;
    }
    // eslint-disable-next-line no-await-in-loop
    await pause(retryInterval);
  }

  throw getErr('waitForModelRRInsert: reached end of loop', { lastErr });
}

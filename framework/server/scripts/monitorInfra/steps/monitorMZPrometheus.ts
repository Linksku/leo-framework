import retry from 'utils/retry';
import promiseTimeout from 'utils/promiseTimeout';
import { MZ_SINK_KAFKA_ERRORS_TABLE } from 'consts/mz';
import { INIT_INFRA_REDIS_KEY } from 'consts/infra';
import { redisMaster } from 'services/redis';
import fetchMZPrometheusFailingSinkIds from '../helpers/fetchMZPrometheusFailingSinkIds';
import recreateFailingPrometheusMZSinks from '../helpers/recreateFailingPrometheusMZSinks';

const LOOP_INTERVAL = 10 * 1000;

export default async function monitorMZPrometheus() {
  printDebug('Monitoring MZ Prometheus', 'highlight');

  while (true) {
    await pause(LOOP_INTERVAL);

    let failing: Awaited<ReturnType<typeof fetchMZPrometheusFailingSinkIds>> | undefined;
    try {
      failing = await promiseTimeout(
        fetchMZPrometheusFailingSinkIds(),
        {
          timeout: 30 * 1000,
          getErr: () => new Error('monitorMZPrometheus: fetchMZPrometheusFailingSinkIds timed out'),
        },
      );
    } catch (err) {
      if (!(err instanceof Error) || !err.message.includes('unknown catalog item')) {
        ErrorLogger.error(err, { ctx: 'monitorMZPrometheus' });
      }
    }

    if (failing?.length) {
      let hasMZKafkaErrorsTable = false;
      let isInitializingInfra = false;
      try {
        const { errorsTableResult, redisResult } = await promiseObj({
          errorsTableResult: rawSelect(
            'mz',
            `
              SELECT 1
              FROM mz_tables
              WHERE name = ?
              LIMIT 1
            `,
            [MZ_SINK_KAFKA_ERRORS_TABLE],
          ),
          redisResult: redisMaster.exists(INIT_INFRA_REDIS_KEY),
        });
        hasMZKafkaErrorsTable = !!errorsTableResult.rows.length;
        isInitializingInfra = !!redisResult;
      } catch {}
      if (!hasMZKafkaErrorsTable || isInitializingInfra) {
        // Wait for fixInfra to run
        continue;
      }

      ErrorLogger.warn(getErr(
        'monitorMZPrometheus: MZ Prometheus failing',
        { models: failing.map(f => f.modelType) },
      ));

      try {
        await retry(
          async () => {
            await recreateFailingPrometheusMZSinks(failing);
            await pause(1000);

            failing = await fetchMZPrometheusFailingSinkIds();
            if (failing.length) {
              throw getErr(
                'Failed to fix failing healthchecks',
                { models: failing.map(f => f.modelType) },
              );
            }
          },
          {
            times: 3,
            interval: 10 * 1000,
            ctx: 'monitorMZPrometheus',
          },
        );

        printDebug('Monitoring after fixing MZ Prometheus', 'highlight');
      } catch (err) {
        await ErrorLogger.fatal(err, { ctx: 'monitorMZPrometheus' });
      }
    }
  }
}

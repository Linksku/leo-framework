// @ts-ignore no module types
import parsePrometheusTextFormat from 'parse-prometheus-text-format';
import fromPairs from 'lodash/fromPairs.js';

import { MZ_HOST, MZ_PORT } from 'consts/infra';
import { MZ_SINK_PREFIX, MZ_SINK_TOPIC_PREFIX, MZ_SINK_KAFKA_ERRORS_TABLE } from 'consts/mz';
import promiseTimeout from 'utils/promiseTimeout';
import knexMZ from 'services/knex/knexMZ';

export default async function fetchMZPrometheusFailingSinkIds() {
  const metricsRes = await promiseTimeout(
    fetch(`http://${MZ_HOST}:${MZ_PORT}/metrics`),
    30 * 1000,
    new Error('fetchMZPrometheusFailingSinkIds: fetch MZ metrics timed out'),
  );
  if (metricsRes.status >= 400) {
    throw new Error(`fetchMZPrometheusFailingSinkIds: fetch MZ metrics failed: ${metricsRes.status}`);
  }

  let {
    promMetricsText,
    existingErrors,
    mzSinks,
  } = await promiseObj({
    // Try to fetch /metrics slightly before errors table in case errors table gets updated
    promMetricsText: metricsRes.text(),
    existingErrors: knexMZ.select(['modelType', 'sinkId'])
      .max({
        count: 'count',
      })
      .from(MZ_SINK_KAFKA_ERRORS_TABLE)
      .groupBy(['modelType', 'sinkId']),
    mzSinks: knexMZ.select(['id', 'name'])
      .from('mz_sinks'),
  });

  promMetricsText = promMetricsText
    .split('\n')
    .filter(l => l.startsWith('mz_kafka_message_delivery_errors_total')
      || l.startsWith('mz_kafka_message_send_errors_total'))
    .join('\n');
  const promMetrics = TS.assertType<{
    name: string,
    metrics: {
      labels: {
        sink_id: string,
        topic: string,
      },
      value: string,
    }[],
  }[]>(
    parsePrometheusTextFormat(promMetricsText),
    val => Array.isArray(val) && val.every(
      v => typeof v.name === 'string' && Array.isArray(v.metrics) && v.metrics.every(
        (m: any) => m.labels && typeof m.labels === 'object'
          && typeof m.labels.sink_id === 'string'
          && typeof m.labels.topic === 'string'
          && typeof m.value === 'string',
      ),
    ),
  );

  const existingErrorsMap = fromPairs(existingErrors.map(row => [row.sinkId, row.count]));
  const sinkIdToModel = fromPairs(mzSinks.map(row => [
    row.id as string,
    (row.name as string).slice(MZ_SINK_PREFIX.length),
  ]));

  const curErrorsMap: ObjectOf<number> = Object.create(null);
  for (const metric of TS.filterNulls(
    promMetrics
      .filter(
        m => m.name === 'mz_kafka_message_delivery_errors_total'
          || m.name === 'mz_kafka_message_send_errors_total',
      )
      .flatMap(m => m.metrics),
  )) {
    if (metric.value === '0' || !metric.labels.topic.startsWith(MZ_SINK_TOPIC_PREFIX)) {
      continue;
    }

    const numErrors = TS.parseIntOrNull(metric.value) ?? 0;
    if (curErrorsMap[metric.labels.sink_id]) {
      curErrorsMap[metric.labels.sink_id]
        = TS.defined(curErrorsMap[metric.labels.sink_id]) + numErrors;
    } else {
      curErrorsMap[metric.labels.sink_id] = numErrors;
    }
  }

  return TS.objEntries(curErrorsMap)
    .filter(pair => pair[1] > (existingErrorsMap[pair[0]] ?? 0) && sinkIdToModel[pair[0]])
    .map(pair => ({
      sinkId: pair[0],
      numErrors: pair[1],
      modelType: sinkIdToModel[pair[0]],
    }));
}

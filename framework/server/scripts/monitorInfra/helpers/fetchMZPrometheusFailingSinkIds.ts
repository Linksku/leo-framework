// @ts-ignore no module types
import _parsePrometheusTextFormat from 'parse-prometheus-text-format';

import { MZ_HOST, MZ_PORT } from 'consts/infra';
import {
  MZ_SINK_PREFIX,
  MZ_SINK_TOPIC_PREFIX,
  MZ_SINK_KAFKA_ERRORS_TABLE,
  MzSinkKafkaErrorsRow,
} from 'consts/mz';
import promiseTimeout from 'utils/promiseTimeout';
import knexMZ from 'services/knex/knexMZ';

const parsePrometheusTextFormat = _parsePrometheusTextFormat as (metrics: string) => unknown;

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
    existingErrors: knexMZ<MzSinkKafkaErrorsRow>(MZ_SINK_KAFKA_ERRORS_TABLE)
      .select(['modelType', 'sinkId'])
      .max({
        count: 'count',
      })
      .groupBy(['modelType', 'sinkId']),
    mzSinks: knexMZ<{ id: string, name: string }>('mz_sinks')
      .select(['id', 'name']),
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
      v => TS.isObj(v)
        && typeof v.name === 'string'
        && Array.isArray(v.metrics)
        && v.metrics.every(
          m => TS.isObj(m)
            && TS.isObj(m.labels)
            && typeof m.labels.sink_id === 'string'
            && typeof m.labels.topic === 'string'
            && typeof m.value === 'string',
        ),
    ),
  );

  const existingErrorsMap = Object.fromEntries(existingErrors.map(row => [row.sinkId, row.count]));
  const sinkIdToModel = Object.fromEntries(mzSinks.map(row => [
    row.id,
    row.name.slice(MZ_SINK_PREFIX.length),
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

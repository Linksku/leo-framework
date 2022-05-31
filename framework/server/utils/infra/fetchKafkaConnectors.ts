import { FetchError } from 'node-fetch';

import fetchJson from 'utils/fetchJson';

export default async function fetchKafkaConnectors(prefix?: string) {
  let response: {
    data?: unknown;
    status: number;
  } | undefined;
  try {
    response = await fetchJson(`http://${process.env.KAFKA_CONNECT_HOST}:${process.env.KAFKA_CONNECT_PORT}/connectors`);
  } catch (err) {
    if (!(err instanceof FetchError)) {
      throw err;
    }
  }
  if (response && response.status >= 400) {
    throw new Error(`fetchKafkaConnectors: status ${response.status}`);
  }

  const connectors = TS.assertType<{ data: string[] }>(
    val => val && Array.isArray(val.data) && val.data.every((v: any) => typeof v === 'string'),
    response,
    new Error('fetchKafkaConnectors: invalid response from GET /connectors'),
  );

  return prefix
    ? connectors.data.filter(name => name.startsWith(prefix))
    : connectors.data;
}

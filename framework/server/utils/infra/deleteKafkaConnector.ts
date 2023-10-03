import fetchJson from 'utils/fetchJson';
import { KAFKA_CONNECT_HOST, KAFKA_CONNECT_PORT } from 'consts/infra';
import retry from 'utils/retry';

export default async function deleteKafkaConnector(name: string) {
  const res = await fetchJson(
    `http://${KAFKA_CONNECT_HOST}:${KAFKA_CONNECT_PORT}/connectors/${encodeURIComponent(name)}`,
    'DELETE',
  );
  if (res.status >= 400 && res.status !== 404) {
    throw getErr(
      `deleteKafkaConnector(${name}): failed to delete connector (${res.status})`,
      { data: res.data },
    );
  }

  await retry(
    async () => {
      const res2 = await fetchJson(
        `http://${KAFKA_CONNECT_HOST}:${KAFKA_CONNECT_PORT}/connectors/${name}`,
      );
      if (res2.status !== 404) {
        throw new Error(
          res2.status >= 400 ? `Error status: ${res2.status}` : 'Not deleted',
        );
      }
    },
    {
      timeout: 60 * 1000,
      interval: 1000,
      ctx: `deleteKafkaConnector(${name}): check deleted`,
    },
  );
}

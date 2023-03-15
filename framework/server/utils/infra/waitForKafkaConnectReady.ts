import retry from 'utils/retry';
import fetchJson from 'utils/fetchJson';
import { KAFKA_CONNECT_HOST, KAFKA_CONNECT_PORT } from 'consts/infra';
import kafkaAdmin from 'services/kafkaAdmin';

export default async function waitForKafkaConnectReady() {
  await retry(
    async () => {
      await kafkaAdmin.listTopics();
    },
    {
      interval: 1000,
      timeout: 5 * 60 * 1000,
      ctx: 'waitForKafkaConnectReady: listTopics',
    },
  );

  await retry(
    async () => {
      const connector = await fetchJson(`http://${KAFKA_CONNECT_HOST}:${KAFKA_CONNECT_PORT}/`);
      if (!connector.data || typeof connector.data !== 'object'
        || !TS.hasProp(connector.data, 'version')) {
        throw new Error('Invalid response');
      }
    },
    {
      interval: 1000,
      timeout: 60 * 1000,
      ctx: 'waitForKafkaConnectReady: fetchJson',
    },
  );
}

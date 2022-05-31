import fetchJson from 'utils/fetchJson';

export default async function deleteKafkaConnector(name: string) {
  const res = await fetchJson(
    `http://${process.env.KAFKA_CONNECT_HOST}:${process.env.KAFKA_CONNECT_PORT}/connectors/${encodeURIComponent(name)}`,
    'DELETE',
  );
  if (res.status >= 400) {
    throw new Error(`deleteKafkaConnector(${name}): failed to delete connector: ${JSON.stringify(res.data)}`);
  }
}

import exec from 'utils/exec';
import promiseTimeout from 'utils/promiseTimeout';

export default async function deleteKafkaTopic(name: string) {
  if (/[^*.A-Z_a-z-]/.test(name)) {
    throw new Error(`deleteKafkaTopic: invalid topic name "${name}"`);
  }

  try {
    await promiseTimeout(
      exec(
        `docker exec broker kafka-topics --bootstrap-server broker:${process.env.KAFKA_BROKER_INTERNAL_PORT} --delete --topic '${name}'`,
      ),
      10_000,
      new Error('deleteKafkaTopic: "docker exec" timed out.'),
    );
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes('does not exist')) {
      throw err;
    }
  }
}

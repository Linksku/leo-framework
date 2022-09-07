import pLimit from 'p-limit';

import fetchJson from 'utils/fetchJson';

const limiter = pLimit(10);

export default async function deleteSchemaRegistry() {
  const { data: schemas } = TS.assertType<{ data: string[] }>(
    val => Array.isArray(val.data) && val.data.every((v: any) => typeof v === 'string'),
    await fetchJson('http://localhost:8081/subjects'),
  );
  if (schemas.length) {
    printDebug(`Deleting ${schemas.length} from Schema Registry`, 'highlight');
    await Promise.all(schemas.map(name => limiter(() => fetchJson(
      `http://localhost:8081/subjects/${name}`,
      'DELETE',
    ))));
  }
}

import pLimit from 'p-limit';

import fetchJson from 'utils/fetchJson';
import { SCHEMA_REGISTRY_HOST, SCHEMA_REGISTRY_PORT } from 'consts/infra';

const limiter = pLimit(10);

export default async function deleteSchemaRegistry(regex?: RegExp) {
  const { data: schemas } = TS.assertType<{ data: string[] }>(
    await fetchJson(`http://${SCHEMA_REGISTRY_HOST}:${SCHEMA_REGISTRY_PORT}/subjects`),
    val => Array.isArray(val.data) && val.data.every((v: any) => typeof v === 'string'),
  );
  if (!schemas.length) {
    return;
  }

  printDebug(`Deleting ${schemas.length} from Schema Registry`, 'highlight');
  await Promise.all(
    schemas
      .filter(name => !regex || regex.test(name))
      .map(name => limiter(() => fetchJson(
        `http://${SCHEMA_REGISTRY_HOST}:${SCHEMA_REGISTRY_PORT}/subjects/${name}`,
        'DELETE',
      ))),
  );
}

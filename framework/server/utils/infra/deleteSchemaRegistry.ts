import throttledPromiseAll from 'utils/throttledPromiseAll';
import fetchJson from 'utils/fetchJson';
import { SCHEMA_REGISTRY_HOST, SCHEMA_REGISTRY_PORT } from 'consts/infra';

export default async function deleteSchemaRegistry(regex?: RegExp) {
  const { data: schemas } = TS.assertType<{ data: string[] }>(
    await fetchJson(`http://${SCHEMA_REGISTRY_HOST}:${SCHEMA_REGISTRY_PORT}/subjects`),
    val => TS.isObj(val)
      && Array.isArray(val.data)
      && val.data.every((v: any) => typeof v === 'string'),
  );
  if (!schemas.length) {
    return;
  }

  printDebug(`Deleting ${schemas.length} from Schema Registry`, 'highlight');
  await throttledPromiseAll(
    10,
    schemas
      .filter(name => !regex || regex.test(name)),
    name => fetchJson(
      `http://${SCHEMA_REGISTRY_HOST}:${SCHEMA_REGISTRY_PORT}/subjects/${name}`,
      { method: 'DELETE' },
    ),
  );
}

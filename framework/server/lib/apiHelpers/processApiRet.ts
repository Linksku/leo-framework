import pickBy from 'lodash/pickBy';

import type { RouteRet } from 'services/ApiManager';
import removeUndefinedValues from 'lib/removeUndefinedValues';
import { isPropDate } from 'lib/modelUtils/dateSchemaHelpers';
import omitSingle from 'lib/omitSingle';
import Model from 'lib/Model/Model';

function _filterDuplicates(existingUniqs: Set<string>, entities: ModelSerializedForApi[]) {
  return entities.filter(e => {
    const key = `${e.type}|${e.id}`;
    if (existingUniqs.has(key)) {
      return false;
    }
    existingUniqs.add(key);
    return true;
  });
}

// entity or entities => entities
function _normalizeEntities(
  entities: Model[],
  createdEntities: Model[],
  updatedEntities: Model[],
) {
  const included: Model[] = [];

  function extractIncluded(data: Model | Model[]) {
    if (Array.isArray(data)) {
      for (const v of data) {
        if (Array.isArray(v)) {
          extractIncluded(v);
        } else if (v instanceof Model) {
          included.push(v);
          extractIncluded(v);
        }
      }
      return;
    }

    const relations = (data.constructor as ModelClass).relationMappings;
    if (!relations) {
      return;
    }
    for (const k of Object.keys(relations)) {
      // @ts-ignore wontfix key error
      const v = data[k];
      if (Array.isArray(v)) {
        extractIncluded(v);
      } else if (v instanceof Model) {
        included.push(v);
        extractIncluded(v);
      }
    }
  }
  extractIncluded(entities);
  extractIncluded(createdEntities);
  extractIncluded(updatedEntities);

  const serializedEntities = entities.map(e => e.$toApiJson());
  const serializedCreatedEntities = createdEntities.map(
    e => e.$toApiJson(),
  );
  const serializedUpdatedEntities = updatedEntities.map(
    e => e.$toApiJson(),
  );
  const serializedIncluded = included.map(e => e.$toApiJson());

  const uniqs = new Set<string>();
  let uniqCreatedEntities = _filterDuplicates(uniqs, serializedCreatedEntities);
  let uniqUpdatedEntities = _filterDuplicates(uniqs, serializedUpdatedEntities);
  let uniqEntities = _filterDuplicates(uniqs, serializedEntities);
  let uniqIncluded = _filterDuplicates(uniqs, serializedIncluded);
  if (process.env.NODE_ENV !== 'production') {
    // Move type to front.
    uniqIncluded = uniqIncluded.map(e => ({ type: e.type, ...omitSingle('type', e) } as ModelSerializedForApi));
    uniqEntities = uniqEntities.map(e => ({ type: e.type, ...omitSingle('type', e) } as ModelSerializedForApi));
    uniqCreatedEntities = uniqCreatedEntities.map(e => ({ type: e.type, ...omitSingle('type', e) } as ModelSerializedForApi));
    uniqUpdatedEntities = uniqUpdatedEntities.map(e => ({ type: e.type, ...omitSingle('type', e) } as ModelSerializedForApi));
  }
  return {
    normalizedEntities: [...uniqEntities, ...uniqIncluded],
    normalizedCreatedEntities: uniqCreatedEntities,
    normalizedUpdatedEntities: uniqUpdatedEntities,
  };
}

function _getDateProps(entities: ModelSerializedForApi[]): ObjectOf<string[]> {
  const dateProps: ObjectOf<string[]> = {};
  for (const e of entities) {
    if (dateProps[e.type]) {
      continue;
    }
    dateProps[e.type] = [];

    for (const [k, v] of TS.objEntries(getModelClass(e.type).getSchema())) {
      if (isPropDate(v)) {
        TS.defined(dateProps[e.type]).push(k);
      }
    }
  }

  return pickBy(dateProps, arr => TS.defined(arr).length);
}

export default function processApiRet<Path extends ApiName>({
  data,
  entities,
  createdEntities,
  updatedEntities,
  deletedIds,
  ...others
}: RouteRet<Path>): ApiSuccessResponse<Path> {
  if (Object.keys(others).length) {
    throw new HandledError('Invalid properties in route response.', 500, others);
  }

  const entitiesFiltered = TS.filterNulls(entities ?? []);
  const createdEntitiesFiltered = TS.filterNulls(createdEntities ?? []);
  const updatedEntitiesFiltered = TS.filterNulls(updatedEntities ?? []);
  if (!entitiesFiltered.every(d => d instanceof Model)) {
    throw new HandledError('Api returned non-entities.', 500);
  }

  const {
    normalizedEntities,
    normalizedCreatedEntities,
    normalizedUpdatedEntities,
  } = _normalizeEntities(
    entitiesFiltered,
    createdEntitiesFiltered,
    updatedEntitiesFiltered,
  );
  const dateProps = _getDateProps([
    ...normalizedEntities,
    ...normalizedCreatedEntities,
    ...normalizedUpdatedEntities,
  ]);

  const ret: ApiSuccessResponse<Path> = {
    status: 200,
    data: removeUndefinedValues(data ?? {}) as ApiNameToData[Path],
    entities: normalizedEntities,
    ...(normalizedCreatedEntities.length ? { createdEntities: normalizedCreatedEntities } : null),
    ...(normalizedUpdatedEntities.length ? { updatedEntities: normalizedUpdatedEntities } : null),
    ...(deletedIds && Object.keys(deletedIds).length ? { deletedIds } : null),
  };
  if (Object.keys(dateProps).length) {
    ret.meta = {
      dateProps,
    };
  }
  return ret;
}

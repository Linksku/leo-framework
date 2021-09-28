import pickBy from 'lodash/pickBy';

import type { RouteRet } from 'services/ApiManager';
import removeUndefinedValues from 'lib/removeUndefinedValues';
import entityTypeToModel from 'lib/entityTypeToModel';
import { isPropDate } from 'lib/dateSchemaHelpers';
import omitSingle from 'lib/omitSingle';

function _filterDuplicates(existingUniqs: Set<string>, entities: SerializedEntity[]) {
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
  entities: Entity[],
  createdEntities: Entity[],
  updatedEntities: Entity[],
) {
  const serializedEntities: SerializedEntity[] = entities.map(
    e => e.$formatApiJsonWrapper(),
  );
  const serializedCreatedEntities: SerializedEntity[] = createdEntities.map(
    e => e.$formatApiJsonWrapper(),
  );
  const serializedUpdatedEntities: SerializedEntity[] = updatedEntities.map(
    e => e.$formatApiJsonWrapper(),
  );
  const included = [] as SerializedEntity[];

  function extractIncluded(data: any): data is SerializedEntity {
    if (Array.isArray(data)) {
      const origLength = data.length;
      for (let i = 0; i < data.length; i++) {
        if (extractIncluded(data[i])) {
          data.splice(i, 1);
          i--;
        }
      }
      if (origLength && !data.length) {
        return true;
      }
    } else if (data !== null && typeof data === 'object' && data.id && data.type) {
      included.push(data as SerializedEntity);
      for (const k of Object.keys(data)) {
        if (extractIncluded(data[k])) {
          delete data[k];
        }
      }
      return true;
    }
    return false;
  }
  serializedEntities.map(data => extractIncluded(data));
  serializedCreatedEntities.map(data => extractIncluded(data));
  serializedUpdatedEntities.map(data => extractIncluded(data));

  const uniqs = new Set<string>();
  let uniqCreatedEntities = _filterDuplicates(uniqs, serializedCreatedEntities);
  let uniqUpdatedEntities = _filterDuplicates(uniqs, serializedUpdatedEntities);
  let uniqEntities = _filterDuplicates(uniqs, serializedEntities);
  let uniqIncluded = _filterDuplicates(uniqs, included);
  if (process.env.NODE_ENV !== 'production') {
    // Move type to front.
    uniqIncluded = uniqIncluded.map(e => ({ type: e.type, ...omitSingle('type', e) }) as SerializedEntity);
    uniqEntities = uniqEntities.map(e => ({ type: e.type, ...omitSingle('type', e) }) as SerializedEntity);
    uniqCreatedEntities = uniqCreatedEntities.map(e => ({ type: e.type, ...omitSingle('type', e) }) as SerializedEntity);
    uniqUpdatedEntities = uniqUpdatedEntities.map(e => ({ type: e.type, ...omitSingle('type', e) }) as SerializedEntity);
  }
  return {
    normalizedEntities: [...uniqEntities, ...uniqIncluded],
    normalizedCreatedEntities: uniqCreatedEntities,
    normalizedUpdatedEntities: uniqUpdatedEntities,
  };
}

function _getDateProps(entities: SerializedEntity[]): ObjectOf<string[]> {
  const dateProps: ObjectOf<string[]> = {};
  for (const e of entities) {
    if (dateProps[e.type] || !TS.hasDefinedProperty(entityTypeToModel, e.type)) {
      continue;
    }
    dateProps[e.type] = [];

    const { allJsonSchema } = entityTypeToModel[e.type];
    for (const k of Object.keys(allJsonSchema.properties)) {
      if (isPropDate(allJsonSchema, k)) {
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
  if (!entitiesFiltered.every(d => d instanceof Entity)) {
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

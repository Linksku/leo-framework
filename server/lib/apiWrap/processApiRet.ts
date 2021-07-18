import pickBy from 'lodash/pickBy';

import type { RouteRet } from 'services/ApiManager';
import removeFalseyValues from 'lib/removeFalseyValues';
import entityTypeToModel from 'lib/entityTypeToModel';
import { isPropDate } from 'models/core/EntityDates';

function _filterDuplicates(entities: SerializedEntity[]) {
  const uniqs = new Set<string>();
  return entities.filter(e => {
    const key = `${e.type}|${e.id}`;
    if (uniqs.has(key)) {
      return false;
    }
    uniqs.add(key);
    return true;
  });
}

// entity or entities => entities
function _normalizeEntities(
  rawEntities: Entity[],
): SerializedEntity[] {
  const entities: SerializedEntity[] = rawEntities.map(e => e.toJSON());
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
  entities.map(data => extractIncluded(data));

  let uniqEntities = _filterDuplicates([...entities, ...included]);
  if (process.env.NODE_ENV !== 'production') {
    // Move type to front.
    // @ts-ignore ignore type being overwritten
    uniqEntities = uniqEntities.map(e => ({ type: e.type, ...e }));
  }
  return uniqEntities;
}

function _getDateProps(entities: SerializedEntity[]): ObjectOf<string[]> {
  const dateProps: ObjectOf<string[]> = {};
  for (const e of entities) {
    if (dateProps[e.type] || !hasDefinedProperty(entityTypeToModel, e.type)) {
      continue;
    }
    dateProps[e.type] = [];

    const { allJsonSchema } = entityTypeToModel[e.type];
    for (const k of Object.keys(allJsonSchema.properties)) {
      if (isPropDate(allJsonSchema, k)) {
        defined(dateProps[e.type]).push(k);
      }
    }
  }

  return pickBy(dateProps, arr => defined(arr).length);
}

export default function processApiRet<Path extends ApiName>({
  entities,
  data,
  deletedIds,
  ...others
}: RouteRet<Path>) {
  if (Object.keys(others).length) {
    throw new HandledError('Invalid properties in route response.', 500, others);
  }

  if (!entities) {
    entities = [];
  } else if (!Array.isArray(entities)) {
    entities = [entities];
  }

  const entitiesFiltered = entities.filter(Boolean) as Entity[];
  if (!entitiesFiltered.every(d => d instanceof Entity)) {
    throw new HandledError('Api didn\'t return entities.', 500);
  }
  const normalizedEntities = _normalizeEntities(entitiesFiltered);
  const dateProps = _getDateProps(normalizedEntities);

  const ret: RouteRet<Path> = {
    entities: normalizedEntities,
    data: removeFalseyValues(data ?? {}) as ApiNameToData[Path],
    deletedIds,
  };
  if (Object.keys(dateProps).length) {
    ret.meta = {
      dateProps,
    };
  }
  return ret;
}

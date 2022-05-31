import pickBy from 'lodash/pickBy';

import removeUndefinedValues from 'utils/removeUndefinedValues';
import { isPropDate } from 'utils/models/dateSchemaHelpers';
import omitSingle from 'utils/omitSingle';
import Model from 'services/model/Model';
import { mergeEntityExtras, mergeEntityDevRelations } from 'utils/models/mergeEntityProps';

function _filterDuplicates(
  seen: ObjectOf<ModelSerializedForApi>,
  entities: ModelSerializedForApi[],
) {
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    const key = `${ent.type},${ent.id}`;
    const seenEnt = seen[key];
    if (seenEnt) {
      seenEnt.extras = mergeEntityExtras(seenEnt.extras, ent.extras);
      seenEnt.devRelations = mergeEntityDevRelations(seenEnt.devRelations, ent.devRelations);

      entities.splice(i, 1);
      i--;
      continue;
    }
    seen[key] = ent;
  }
}

// entity or entities => entities
function _normalizeEntities(
  entities: Model[],
  createdEntities: Model[],
  updatedEntities: Model[],
) {
  const relatedEntities: Model[] = [];
  for (const entity of [...entities, ...createdEntities, ...updatedEntities]) {
    if (entity.relations) {
      for (const relation of Object.values(entity.relations)) {
        if (Array.isArray(relation)) {
          relatedEntities.push(...relation);
        } else if (relation) {
          relatedEntities.push(relation);
        }
      }
    }
  }

  let normalizedEntities = [...entities, ...relatedEntities]
    .map(e => e.$toApiJson());
  let normalizedCreatedEntities = createdEntities.map(e => e.$toApiJson());
  let normalizedUpdatedEntities = updatedEntities.map(e => e.$toApiJson());

  const seen: ObjectOf<ModelSerializedForApi> = Object.create(null);
  _filterDuplicates(seen, normalizedCreatedEntities);
  _filterDuplicates(seen, normalizedUpdatedEntities);
  _filterDuplicates(seen, normalizedEntities);
  if (!process.env.PRODUCTION) {
    // Move type to front.
    normalizedEntities = normalizedEntities.map(e => ({ type: e.type, ...omitSingle('type', e) } as ModelSerializedForApi));
    normalizedCreatedEntities = normalizedCreatedEntities.map(e => ({ type: e.type, ...omitSingle('type', e) } as ModelSerializedForApi));
    normalizedUpdatedEntities = normalizedUpdatedEntities.map(e => ({ type: e.type, ...omitSingle('type', e) } as ModelSerializedForApi));
  }
  return {
    normalizedEntities,
    normalizedCreatedEntities,
    normalizedUpdatedEntities,
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

function _getRelations(entities: Model[]): ApiRelationsConfigs {
  const relations: ApiRelationsConfigs = {};
  for (const ent of entities) {
    if (!ent.relations) {
      continue;
    }
    const cls = ent.constructor as ModelClass;
    const entityRelations = TS.objValOrSetDefault(relations, cls.type, {});
    for (const name of Object.keys(ent.relations)) {
      if (entityRelations[name]) {
        continue;
      }
      const relationConfig = cls.relationsMap[name];
      if (!relationConfig) {
        throw new Error(`processApiRet._getRelations: unknown relation ${cls.type}.${name}`);
      }
      entityRelations[name] = {
        ...relationConfig,
        fromModel: relationConfig.fromModel.type,
        toModel: relationConfig.toModel.type,
        through: relationConfig.through
          ? {
            ...relationConfig.through,
            model: relationConfig.through.model.type,
          }
          : undefined,
      };
    }
  }
  return relations;
}

export default function processApiRet<Path extends ApiName>({
  data,
  entities,
  createdEntities,
  updatedEntities,
  deletedIds,
  ...others
}: ApiRouteRet<Path>): ApiSuccessResponse<Path> {
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
  const relations = _getRelations([
    ...entitiesFiltered,
    ...createdEntitiesFiltered,
    ...updatedEntitiesFiltered,
  ]);

  const meta: ApiSuccessResponse<Path>['meta'] = {};
  const ret: ApiSuccessResponse<Path> = {
    status: 200,
    data: removeUndefinedValues(data ?? {}) as ApiNameToData[Path],
    meta,
    entities: normalizedEntities,
    ...(normalizedCreatedEntities.length ? { createdEntities: normalizedCreatedEntities } : null),
    ...(normalizedUpdatedEntities.length ? { updatedEntities: normalizedUpdatedEntities } : null),
    ...(deletedIds && Object.keys(deletedIds).length ? { deletedIds } : null),
  };
  if (Object.keys(dateProps).length) {
    meta.dateProps = dateProps;
  }
  if (Object.keys(relations).length) {
    meta.relationConfigs = relations;
  }
  return ret;
}

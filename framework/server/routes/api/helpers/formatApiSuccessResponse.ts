import pickBy from 'lodash/pickBy';

import type { ModelRelation } from 'services/model/helpers/modelRelations';
import removeUndefinedValues from 'utils/removeUndefinedValues';
import { isPropDate } from 'utils/models/dateSchemaHelpers';
import Model from 'services/model/Model';
import { mergeEntityExtras, mergeEntityIncludedRelations } from 'utils/models/mergeEntityProps';
import getRelation from 'utils/models/getRelation';
import selectRelatedWithAssocs, { RelatedResults } from 'utils/models/selectRelatedWithAssocs';

function _filterDuplicates(seen: ObjectOf<Model>, entities: Model[]) {
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    const key = `${(ent.constructor as ModelClass).type},${ent.getId()}`;
    const seenEnt = seen[key];
    if (seenEnt) {
      if (seenEnt.extras || ent.extras) {
        seenEnt.extras = mergeEntityExtras(seenEnt.extras, ent.extras);
      }
      if (seenEnt.includedRelations || ent.includedRelations) {
        seenEnt.includedRelations = mergeEntityIncludedRelations(
          seenEnt.includedRelations,
          ent.includedRelations,
        );
      }

      entities.splice(i, 1);
      i--;
    } else {
      seen[key] = ent;
    }
  }
}

function _getDateProps(entities: ModelSerializedForApi[]): ObjectOf<string[]> {
  const dateProps: ObjectOf<string[]> = {};
  for (const e of entities) {
    if (dateProps[e.type]) {
      continue;
    }
    dateProps[e.type] = [];

    for (const pair of TS.objEntries(getModelClass(e.type).getSchema())) {
      if (isPropDate(pair[1])) {
        TS.defined(dateProps[e.type]).push(pair[0]);
      }
    }
  }

  return pickBy(dateProps, arr => TS.defined(arr).length);
}

function _relationToApiRelationConfig(relation: ModelRelation): ApiRelationConfig {
  return {
    ...relation,
    fromModel: relation.fromModel.type,
    toModel: relation.toModel.type,
    through: relation.through
      ? {
        ...relation.through,
        model: relation.through.model.type,
      }
      : undefined,
  };
}

function _getRelationConfigs(entities: Model[]): ApiRelationConfigs {
  const relationConfigs: ApiRelationConfigs = {};
  for (const ent of entities) {
    if (!ent.includedRelations) {
      continue;
    }

    const cls = ent.constructor as ModelClass;
    const entityRelationConfigs = TS.objValOrSetDefault(relationConfigs, cls.type, {});
    for (const relationName of ent.includedRelations) {
      const relations = getRelation(cls.type, relationName);
      const relation = Array.isArray(relations) ? relations[0] : relations;
      const nestedRelation = Array.isArray(relations) ? relations[1] : null;

      if (!entityRelationConfigs[relation.name]) {
        entityRelationConfigs[relation.name] = _relationToApiRelationConfig(relation);
      }

      if (nestedRelation) {
        const nestedRelationConfigs = TS.objValOrSetDefault(
          relationConfigs,
          relation.fromModel.type,
          {},
        );
        if (!nestedRelationConfigs[nestedRelation.name]) {
          nestedRelationConfigs[nestedRelation.name] = _relationToApiRelationConfig(nestedRelation);
        }
      }
    }
  }
  return relationConfigs;
}

async function _fetchIncludedRelatedEntities(entities: Model[]): Promise<Model[]> {
  const promises: RelatedResults[] = [];
  for (const ent of entities) {
    if (!ent.includedRelations) {
      continue;
    }

    const relationsSet = new Set(ent.includedRelations);
    for (const relation of relationsSet) {
      const parts = relation.split('.');
      if (parts.length >= 2 && relationsSet.has(parts[0])) {
        relationsSet.delete(parts[0]);
      }
    }

    if (process.env.PRODUCTION) {
      delete ent.includedRelations;
    }

    for (const relation of relationsSet) {
      promises.push(selectRelatedWithAssocs(
        ent.constructor as ModelClass,
        ent,
        relation,
      ));
    }
  }

  const results = await Promise.all(promises);

  return results.flatMap(result => {
    if (Array.isArray(result.related)) {
      return [...result.related, ...result.assocs];
    }
    if (result.related) {
      return [result.related, ...result.assocs];
    }
    return [];
  });
}

export default async function formatApiSuccessResponse<Path extends ApiName>({
  data,
  entities,
  createdEntities,
  updatedEntities,
  deletedIds,
  ...others
}: ApiRouteRet<Path>): Promise<ApiSuccessResponse<Path>> {
  if (Object.keys(others).length) {
    throw new UserFacingError(
      'Invalid properties in route response.',
      500,
      { additionalProperities: others },
    );
  }

  const entitiesFiltered = TS.filterNulls(entities ?? []);
  const createdEntitiesFiltered = TS.filterNulls(createdEntities ?? []);
  const updatedEntitiesFiltered = TS.filterNulls(updatedEntities ?? []);
  const allEntitiesFiltered = [
    ...entitiesFiltered,
    ...createdEntitiesFiltered,
    ...updatedEntitiesFiltered,
  ];
  if (!allEntitiesFiltered.every(d => d instanceof Model)) {
    throw new UserFacingError('Api returned non-entities.', 500);
  }

  const seen: ObjectOf<Model> = Object.create(null);
  _filterDuplicates(seen, createdEntitiesFiltered);
  _filterDuplicates(seen, updatedEntitiesFiltered);
  _filterDuplicates(seen, entitiesFiltered);

  const relationConfigs = _getRelationConfigs(allEntitiesFiltered);
  const related = await _fetchIncludedRelatedEntities(allEntitiesFiltered);
  _filterDuplicates(seen, related);
  entitiesFiltered.push(...related);

  const normalizedEntities = entitiesFiltered.map(e => e.$toApiJson());
  const normalizedCreatedEntities = createdEntitiesFiltered.map(e => e.$toApiJson());
  const normalizedUpdatedEntities = updatedEntitiesFiltered.map(e => e.$toApiJson());

  const dateProps = _getDateProps([
    ...normalizedEntities,
    ...normalizedCreatedEntities,
    ...normalizedUpdatedEntities,
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
  if (Object.keys(relationConfigs).length) {
    meta.relationConfigs = relationConfigs;
  }
  return ret;
}

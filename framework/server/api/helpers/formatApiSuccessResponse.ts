import countBy from 'lodash/countBy.js';

import type { ModelRelation } from 'services/model/helpers/modelRelations';
import removeUndefinedValues from 'utils/removeUndefinedValues';
import { isPropDate } from 'utils/models/dateSchemaHelpers';
import Model from 'services/model/Model';
import { mergeEntityIncludedRelations } from 'utils/models/mergeEntityProps';
import getRelation from 'utils/models/getRelation';
import selectRelatedWithAssocs, { RelatedResults } from 'utils/models/selectRelatedWithAssocs';
import { IS_PROFILING_API } from 'consts/infra';

function _filterDuplicates(seen: Map<string, Model>, entities: Model[]) {
  for (let i = 0; i < entities.length; i++) {
    const ent = entities[i];
    const key = `${(ent.constructor as ModelClass).type},${ent.getId()}`;
    const seenEnt = seen.get(key);
    if (seenEnt) {
      if (seenEnt.includedRelations || ent.includedRelations) {
        if (seenEnt.includedRelations) {
          seenEnt.includedRelations = mergeEntityIncludedRelations(
            seenEnt.includedRelations,
            ent.includedRelations,
          );
        } else {
          Object.defineProperty(
            seenEnt,
            'includedRelations',
            {
              value: mergeEntityIncludedRelations(
                seenEnt.includedRelations,
                ent.includedRelations,
              ),
              enumerable: false,
              writable: true,
              configurable: true,
            },
          );
        }
      }

      entities.splice(i, 1);
      i--;
    } else {
      seen.set(key, ent);
    }
  }
}

const datePropsCache = new Map<ModelType, string[] | null>();
function _getDateProps(
  entities: ModelSerializedForApi[],
): Partial<Record<ModelType, string[]>> {
  const dateProps: ObjectOf<string[]> = Object.create(null);
  for (const e of entities) {
    if (dateProps[e.type]) {
      continue;
    }
    if (datePropsCache.has(e.type)) {
      const cached = datePropsCache.get(e.type);
      if (cached != null) {
        dateProps[e.type] = cached;
      }
      continue;
    }

    const entDateProps: string[] = [];
    for (const pair of TS.objEntries(getModelClass(e.type).getSchema())) {
      if (isPropDate(pair[1])) {
        entDateProps.push(pair[0]);
      }
    }
    if (entDateProps.length) {
      dateProps[e.type] = entDateProps;
    }
    datePropsCache.set(e.type, entDateProps.length ? entDateProps : null);
  }

  return dateProps;
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
  const relationConfigs: ApiRelationConfigs = Object.create(null);
  for (const ent of entities) {
    if (!ent.includedRelations) {
      continue;
    }

    const cls = ent.constructor as RRModelClass;
    const entRelationConfigs = TS.objValOrSetDefault(relationConfigs, cls.type, {});
    for (const relationName of ent.includedRelations) {
      const relations = getRelation(cls.type, relationName);

      const relation = Array.isArray(relations) ? relations[0] : relations;
      if (!entRelationConfigs[relation.name]) {
        entRelationConfigs[relation.name] = _relationToApiRelationConfig(relation);
      }

      const nestedRelation = Array.isArray(relations) ? relations[1] : null;
      if (nestedRelation) {
        const nestedRelationConfigs = TS.objValOrSetDefault(
          relationConfigs,
          nestedRelation.fromModel.type,
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
  const startTime = performance.now();
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
  const flattened = results.flatMap(result => {
    if (Array.isArray(result.related)) {
      return [...result.related, ...result.assocs];
    }
    if (result.related) {
      return [result.related, ...result.assocs];
    }
    // Always return assocs even if relation leaf doesn't exist
    return result.assocs;
  });

  if (IS_PROFILING_API && flattened.length) {
    // eslint-disable-next-line no-console
    console.log(`relatedEntities: ${flattened.length} related in ${Math.round(performance.now() - startTime)}ms`);
  }

  return flattened;
}

export default async function formatApiSuccessResponse<Name extends ApiName>(
  name: Name,
  {
    data,
    entities,
    createdEntities,
    updatedEntities,
    deletedIds,
    ...others
  }: ApiRouteRet<Name>,
): Promise<ApiSuccessResponse<Name>> {
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
  if ([
    ...entitiesFiltered,
    ...createdEntitiesFiltered,
    ...updatedEntitiesFiltered,
  ].some(d => !(d instanceof Model))) {
    throw new UserFacingError('Api returned non-entities.', 500);
  }

  const seen = new Map<string, Model>();
  _filterDuplicates(seen, createdEntitiesFiltered);
  _filterDuplicates(seen, updatedEntitiesFiltered);
  _filterDuplicates(seen, entitiesFiltered);

  const allEntitiesDeduped = [
    ...entitiesFiltered,
    ...createdEntitiesFiltered,
    ...updatedEntitiesFiltered,
  ];
  const relationConfigs = _getRelationConfigs(allEntitiesDeduped);
  const related = await _fetchIncludedRelatedEntities(allEntitiesDeduped);

  if (!process.env.PRODUCTION) {
    const numSeen = related.filter(
      e => seen.has(`${(e.constructor as ModelClass).type},${e.getId()}`),
    ).length;
    if (numSeen / related.length > 0.1 && numSeen >= 10) {
      const counts = countBy(related, ent => (ent.constructor as ModelClass).type);
      const maxCount = Math.max(...Object.values(counts));
      const maxCountType = Object.keys(counts).find(k => counts[k] === maxCount);
      if (numSeen / related.length > 0.5) {
        throw getErr(
          `formatApiSuccessResponse(${name}): too many duplicate related entities`,
          {
            numSeen,
            numRelated: related.length,
            maxCountType,
            maxCount,
          },
        );
      } else {
        ErrorLogger.warn(
          new Error(`formatApiSuccessResponse(${name}): too many duplicate related entities`),
          {
            numSeen,
            numRelated: related.length,
            maxCountType,
            maxCount,
          },
        );
      }
    }
  }

  _filterDuplicates(seen, related);
  entitiesFiltered.push(...related);

  const normalizedEntities = entitiesFiltered.map(e => e.$toApiPojo());
  const normalizedCreatedEntities = createdEntitiesFiltered.map(e => e.$toApiPojo());
  const normalizedUpdatedEntities = updatedEntitiesFiltered.map(e => e.$toApiPojo());

  const dateProps = _getDateProps([
    ...normalizedEntities,
    ...normalizedCreatedEntities,
    ...normalizedUpdatedEntities,
  ]);

  const meta: ApiSuccessResponse<any>['meta'] = Object.create(null);
  if (Object.keys(dateProps).length) {
    meta.dateProps = dateProps;
  }
  if (Object.keys(relationConfigs).length) {
    meta.relationConfigs = relationConfigs;
  }
  return {
    status: 200,
    data: removeUndefinedValues(data ?? {}) as ApiNameToData[Name],
    meta,
    entities: normalizedEntities,
    ...(normalizedCreatedEntities.length ? { createdEntities: normalizedCreatedEntities } : null),
    ...(normalizedUpdatedEntities.length ? { updatedEntities: normalizedUpdatedEntities } : null),
    ...(deletedIds && Object.keys(deletedIds).length ? { deletedIds } : null),
  };
}

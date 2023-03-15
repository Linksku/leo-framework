import useEntityByField from 'utils/hooks/entities/useEntityByField';
import { API_TIMEOUT } from 'settings';
import useShallowMemoObj from 'utils/hooks/useShallowMemoObj';
import useRelationConfig from 'utils/hooks/entities/useRelationConfig';

const warnedRelations = new Set<string>();

// todo: low/mid improve perf by removing useEntityByField
export default function useRelation<
  T extends EntityType,
  RelationName extends string & keyof EntityRelationTypes<T>,
  RelationType extends Defined<EntityRelationTypes<T>[RelationName]>,
>(
  entityType: T,
  entityId: Nullish<EntityId | (string | number)[]>,
  relationName: RelationName,
): Nullish<Memoed<RelationType>> {
  const entity = useEntity(entityType, entityId);
  const relationConfig = useRelationConfig(entityType, relationName);

  if (!process.env.PRODUCTION) {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { entitiesRef } = useEntitiesStore();

    if (entityId
      && entity
      && !entity.includedRelations?.some(r => r === relationName || r.startsWith(`${relationName}.`))) {
      setTimeout(() => {
        const id = Array.isArray(entityId) ? entityId.join(',') : entityId;
        const newEntity = entitiesRef.current[entityType]?.[id];
        const key = `${entityType}, ${entityId}, ${relationName}`;
        if (!warnedRelations.has(key)) {
          if (newEntity && !newEntity.includedRelations?.some(
            r => r === relationName || r.startsWith(`${relationName}.`),
          )) {
            ErrorLogger.warn(new Error(`useRelation(${key}): missing relation`));
          }
          warnedRelations.add(key);
        }
      }, API_TIMEOUT);
    }
  }

  const throughEntities = useEntityByField(
    relationConfig?.through?.model ?? null,
    relationConfig?.through?.from ?? 'ENTITY_FIELD_HACK',
  );
  const throughEntity = entity && relationConfig
    ? throughEntities[
      // @ts-ignore wontfix key error
      entity[
        relationConfig.fromCol
      ]
    ]
    : undefined;
  const relatedEntities = useEntityByField(
    relationConfig?.toModel ?? null,
    relationConfig?.toCol ?? 'ENTITY_FIELD_HACK',
  );

  let related: Nullish<Memoed<RelationType>>;
  if (!entity || !relationConfig) {
    related = null;
  } else if (relationConfig.through && throughEntity) {
    // @ts-ignore wontfix key error
    const toCol = throughEntity[relationConfig.through.to];
    related = (Array.isArray(toCol)
      ? toCol.map(col => relatedEntities[col])
      : relatedEntities[
        toCol
      ]) as Memoed<RelationType>;
  } else if (!relationConfig.through) {
    // @ts-ignore wontfix key error
    const fromCol = entity[relationConfig.fromCol];
    related = (Array.isArray(fromCol)
      ? fromCol.map(col => relatedEntities[col])
      : relatedEntities[
        fromCol
      ]) as Memoed<RelationType>;
  } else {
    related = undefined;
  }

  return useShallowMemoObj(related);
}

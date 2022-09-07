import useEntityByField from 'utils/hooks/entities/useEntityByField';
import { HTTP_TIMEOUT } from 'settings';

const warnedRelations = new Set<string>();

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
  const { relationConfigs } = useApiStore();
  const relationConfig = relationConfigs[entityType]?.[relationName];

  const { entitiesRef } = useEntitiesStore();
  if (!process.env.PRODUCTION
    && entityId
    && entity
    && !entity.includedRelations?.some(r => r === relationName || r.startsWith(`${relationName}.`))) {
    setTimeout(() => {
      const id = Array.isArray(entityId) ? entityId.join(',') : entityId;
      const newEntity = entitiesRef.current[entityType]?.[id];
      const key = `${entityType}, ${entityId}, ${relationName}`;
      if (!warnedRelations.has(key)) {
        if (newEntity && !newEntity.includedRelations?.includes(relationName)) {
          ErrorLogger.warn(new Error(`useRelation(${key}): missing relation`));
        }
        warnedRelations.add(key);
      }
    }, HTTP_TIMEOUT);
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

  if (!entity || !relationConfig) {
    return null;
  }
  if (relationConfig.through && throughEntity) {
    return relatedEntities[
      // @ts-ignore wontfix key error
      throughEntity[
        relationConfig.through.to
      ]
    ] as Memoed<RelationType>;
  }
  if (!relationConfig.through) {
    return relatedEntities[
      // @ts-ignore wontfix key error
      entity[
        relationConfig.fromCol
      ]
    ] as Memoed<RelationType>;
  }
  return undefined;
}

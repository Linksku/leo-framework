import useEntityByField from 'utils/hooks/entities/useEntityByField';

export default function useRelation<
  T extends EntityType,
  RelationName extends string & keyof ModelRelationsTypes<T>,
  RelationType extends Defined<ModelRelationsTypes<T>[RelationName]>
>(
  entityType: T,
  entityId: Nullish<EntityId | (string | number)[]>,
  relationName: RelationName,
): Nullish<Memoed<RelationType>> {
  const entity = useEntity(entityType, entityId);
  if (!process.env.PRODUCTION && entity && !entity.devRelations?.includes(relationName)) {
    throw new Error(`useRelation(${entityType}, ${entityId}, ${relationName}): relation not included`);
  }

  const { relationsConfigs } = useApiStore();
  const relationConfig = relationsConfigs[entityType]?.[relationName];
  if (entity && !relationConfig) {
    throw new Error(`useRelation(${entityType}, ${entityId}, ${relationName}): missing relation config`);
  }

  const throughEntities = useEntityByField(
    relationConfig?.through?.model ?? ('ENTITY_TYPE_HACK' as EntityType),
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
    relationConfig?.toModel ?? ('ENTITY_TYPE_HACK' as EntityType),
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

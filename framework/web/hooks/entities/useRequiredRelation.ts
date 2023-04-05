export default function useRequiredRelation<
  T extends EntityType,
  RelationName extends string & keyof {
    [K in keyof EntityRelationTypes<T>]: EntityRelationTypes<T>[K] extends any[]
      ? never
      : EntityRelationTypes<T>[K];
  },
  RelationType extends Defined<EntityRelationTypes<T>[RelationName]>,
>(
  entityType: T,
  entityId: Nullish<EntityId | (string | number)[]>,
  relationName: RelationName,
): Memoed<Exclude<RelationType, null>> {
  const ent = useRelation(entityType, entityId, relationName);
  if (ent) {
    throw new Error(`Required relation ${entityType}.${entityId}.${relationName} not found.`);
  }

  return ent as unknown as Memoed<Exclude<RelationType, null>>;
}

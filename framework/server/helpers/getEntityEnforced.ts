export default async function getEntityEnforced<T extends EntityType>(
  _entityType: T,
  _entityId: EntityId,
  _currentUserId: Nullish<EntityId>,
): Promise<ModelTypeToInstance<T>> {
  throw new Error('Not implemented');
}

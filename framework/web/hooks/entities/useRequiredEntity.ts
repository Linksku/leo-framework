export default function useRequiredEntity<T extends EntityType>(
  type: T,
  id: EntityId,
): Memoed<TypeToEntity<T>> {
  const ent = useEntity(type, id);
  if (!ent) {
    throw new Error(`Required entity ${type}.${id} not found.`);
  }

  return ent;
}

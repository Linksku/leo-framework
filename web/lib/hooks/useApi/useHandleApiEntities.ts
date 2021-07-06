import type { EntityApiTypes } from './useApiTypes';

export default function useHandleApiEntities<Name extends ApiName>(
  type: EntityApiTypes,
) {
  const loadEntities = useLoadEntities();
  const createEntities = useCreateEntities();
  const updateEntities = useUpdateEntities();
  const deleteEntities = useDeleteEntities();

  return useCallback(({ entities, deletedIds, meta }: ApiResponse<Name>) => {
    if (entities) {
      if (meta?.dateProps) {
        for (const ent of entities) {
          if (meta.dateProps[ent.type]) {
            for (const prop of meta.dateProps[ent.type]) {
              ent[prop] = new Date(ent[prop]);
            }
          }
        }
      }

      if (type === 'create') {
        createEntities(entities);
      } else if (type === 'update' || type === 'delete') {
        updateEntities(entities);
      } else {
        loadEntities(entities);
      }
    }

    if (deletedIds) {
      if (process.env.NODE_ENV !== 'production' && type !== 'delete') {
        throw new Error('deletedIds exists when type isn\'t delete');
      }

      for (const [entityType, ids] of objectEntries(deletedIds)) {
        deleteEntities(
          entityType,
          e => ids?.includes(e.id) ?? false,
        );
      }
    }
  }, [type, createEntities, updateEntities, loadEntities, deleteEntities]);
}

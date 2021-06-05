import type { EntityApiTypes } from './useApiTypes';

export default function useHandleApiEntities<Name extends ApiName>(
  type: EntityApiTypes,
) {
  const loadEntities = useLoadEntities();
  const createEntities = useCreateEntities();
  const updateEntities = useUpdateEntities();
  const deleteEntities = useDeleteEntities();

  return useCallback((response: ApiResponse<Name>) => {
    if (response.entities) {
      if (type === 'create') {
        createEntities(response.entities);
      } else if (type === 'update' || type === 'delete') {
        updateEntities(response.entities);
      } else {
        loadEntities(response.entities);
      }
    }

    if (response.deletedIds) {
      if (process.env.NODE_ENV !== 'production' && type !== 'delete') {
        throw new Error('deletedIds exists when type isn\'t delete');
      }

      for (const entityType of Object.keys(response.deletedIds) as EntityType[]) {
        deleteEntities(
          entityType,
          e => response.deletedIds[entityType]?.includes(e.id) ?? false,
        );
      }
    }
  }, [type, createEntities, updateEntities, loadEntities, deleteEntities]);
}

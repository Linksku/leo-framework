import type { EntityApiTypes } from './useApiTypes';

export default function useHandleApiEntities<Name extends ApiName>(
  type: EntityApiTypes,
) {
  const loadEntities = useLoadEntities();
  const createEntities = useCreateEntities();
  const updateEntities = useUpdateEntities();
  const deleteEntities = useDeleteEntities();

  return useCallback(({ entities, deletedIds, meta }: ApiSuccessResponse<Name>) => {
    if (entities) {
      if (meta?.dateProps) {
        for (const ent of entities) {
          const dateProps = meta.dateProps[ent.type] as (keyof typeof ent)[] | undefined;
          if (dateProps) {
            for (const prop of dateProps) {
              if (hasOwnProperty(ent, prop)) {
                // @ts-ignore adding new prop to ent
                ent[prop] = new Date(ent[prop]);
              }
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

      for (const [entityType, ids] of objectEntries(deletedIds, true)) {
        deleteEntities(
          entityType,
          e => ids?.includes(e.id) ?? false,
        );
      }
    }
  }, [type, createEntities, updateEntities, loadEntities, deleteEntities]);
}

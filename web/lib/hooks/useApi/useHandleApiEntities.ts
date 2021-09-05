function _transformDateProps(
  entities: Entity[],
  dateProps?: {
    [T in EntityType]?: string[];
  },
) {
  if (dateProps) {
    for (const ent of entities) {
      const entDateProps = dateProps[ent.type];
      if (entDateProps) {
        for (const prop of entDateProps) {
          if (TS.hasProperty(ent, prop)) {
            // new Date() gets timezone wrong if not specified.
            // @ts-ignore adding new prop to ent
            ent[prop] = dayjs(ent[prop]).toDate();
          }
        }
      }
    }
  }
}

export default function useHandleApiEntities<Name extends ApiName>(
  type: EntityApiAction,
) {
  const loadEntities = useLoadEntities();
  const createEntities = useCreateEntities();
  const updateEntities = useUpdateEntities();
  const deleteEntities = useDeleteEntities();

  return useCallback(({
    entities,
    createdEntities,
    updatedEntities,
    deletedIds,
    meta,
  }: MemoDeep<ApiSuccessResponse<Name>>) => {
    const isPostType = type !== 'load';
    if (entities) {
      _transformDateProps(entities, meta?.dateProps);
      loadEntities(entities);
    }

    if (createdEntities) {
      if (process.env.NODE_ENV !== 'production' && !isPostType) {
        throw new Error('createdEntities exists when type isn\'t create');
      }
      _transformDateProps(createdEntities, meta?.dateProps);
      createEntities(createdEntities);
    }

    if (updatedEntities) {
      if (process.env.NODE_ENV !== 'production' && !isPostType) {
        throw new Error('updatedEntities exists when type isn\'t update');
      }
      _transformDateProps(updatedEntities, meta?.dateProps);
      updateEntities(updatedEntities);
    }

    if (deletedIds) {
      if (process.env.NODE_ENV !== 'production' && !isPostType) {
        throw new Error('deletedIds exists when type isn\'t delete');
      }

      for (const [entityType, ids] of TS.objectEntries(deletedIds, true)) {
        deleteEntities(
          entityType,
          e => ids?.includes(e.id) ?? false,
        );
      }
    }
  }, [type, createEntities, updateEntities, loadEntities, deleteEntities]);
}

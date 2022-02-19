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
          const val = TS.getProp(ent, prop);
          if (val) {
            // new Date() gets timezone wrong if not specified.
            // @ts-ignore adding new prop to ent
            ent[prop] = dayjs(ent[prop]).toDate();
          }
        }
      }
    }
  }
}

export default function useHandleApiEntities(
  allowPost = false,
) {
  const { loadEntities, createEntities, updateEntities, deleteEntities } = useEntitiesStore();

  return useCallback(({
    entities,
    createdEntities,
    updatedEntities,
    deletedIds,
    meta,
  }: MemoDeep<ApiSuccessResponse<any>>) => {
    if (process.env.NODE_ENV !== 'production') {
      const invalidEnt = [...entities, ...(createdEntities ?? []), ...(updatedEntities ?? [])]
        .find(ent => !ent.id || !ent.type || TS.hasProp(ent, 'version'));
      if (invalidEnt) {
        throw new Error(`useHandleApiEntities: invalid ent "${JSON.stringify(invalidEnt)}"`);
      }
    }

    if (entities) {
      _transformDateProps(entities, meta?.dateProps);
      loadEntities(entities);
    }

    // Handle deletions before creations in case ID is reused
    if (deletedIds) {
      if (process.env.NODE_ENV !== 'production' && !allowPost) {
        throw new Error('useHandleApiEntities: deletedIds exists when action type isn\'t delete');
      }

      for (const [entityType, ids] of TS.objEntries(deletedIds, true)) {
        if (ids) {
          deleteEntities(
            entityType,
            ids,
          );
        }
      }
    }

    if (createdEntities) {
      if (process.env.NODE_ENV !== 'production' && !allowPost) {
        throw new Error('useHandleApiEntities: createdEntities exists when action type isn\'t create');
      }
      _transformDateProps(createdEntities, meta?.dateProps);
      createEntities(createdEntities);
    }

    if (updatedEntities) {
      if (process.env.NODE_ENV !== 'production' && !allowPost) {
        throw new Error('useHandleApiEntities: updatedEntities exists when action type isn\'t update');
      }
      _transformDateProps(updatedEntities, meta?.dateProps);
      updateEntities(updatedEntities);
    }
  }, [allowPost, createEntities, updateEntities, loadEntities, deleteEntities]);
}

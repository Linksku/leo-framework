function _transformDateProps(
  entities: ModelSerializedForApi[],
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
            // ent[prop] = dayjs(ent[prop]).toDate();
            // @ts-expect-error wontfix add key
            ent[prop] = new Date(ent[prop]);
          }
        }
      }
    }
  }
}

export default function useHandleApiEntities(allowPost = false) {
  const {
    loadEntities,
    createEntities,
    updateEntities,
    deleteEntities,
  } = useEntitiesStore();
  const { addRelationConfigs } = useRelationsStore();

  return useCallback(({
    entities,
    createdEntities,
    updatedEntities,
    deletedIds,
    meta,
  }: StableDeep<ApiSuccessResponse<any>>) => {
    if (!process.env.PRODUCTION) {
      const invalidEnt = [...entities, ...(createdEntities ?? []), ...(updatedEntities ?? [])]
        .find(ent => !ent.id || !ent.type || TS.hasProp(ent, 'version'));
      if (invalidEnt) {
        throw new Error(`useHandleApiEntities: invalid ent "${JSON.stringify(invalidEnt)}"`);
      }
    }

    // Handle deletions before creations in case ID is reused
    if (deletedIds) {
      if (!process.env.PRODUCTION && !allowPost) {
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

    if (createdEntities?.length) {
      if (!process.env.PRODUCTION && !allowPost) {
        throw new Error('useHandleApiEntities: createdEntities exists when action type isn\'t create');
      }
      _transformDateProps(createdEntities, meta?.dateProps);
      createEntities(createdEntities);
    }

    if (updatedEntities?.length) {
      if (!process.env.PRODUCTION && !allowPost) {
        throw new Error('useHandleApiEntities: updatedEntities exists when action type isn\'t update');
      }
      _transformDateProps(updatedEntities, meta?.dateProps);
      updateEntities(updatedEntities);
    }

    if (entities?.length) {
      _transformDateProps(entities, meta?.dateProps);
      // loadEntities last, in case created/updated entities trigger mutateEntity on loaded entities
      loadEntities(entities);
    }

    if (meta?.relationConfigs) {
      addRelationConfigs(meta?.relationConfigs);
    }
  }, [
    allowPost,
    createEntities,
    updateEntities,
    loadEntities,
    deleteEntities,
    addRelationConfigs,
  ]);
}

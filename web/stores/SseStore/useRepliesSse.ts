export default function useRepliesSse(sseEmitter) {
  const createEntities = useCreateEntities();
  const loadEntities = useLoadEntities();
  const deleteEntities = useDeleteEntities();

  const handleCreatedEntities = useCallback((_params, { entities, included }) => {
    batchedUpdates(() => {
      createEntities(entities);
      loadEntities(included);
    });
  }, [createEntities, loadEntities]);

  useEffect(() => {
    sseEmitter.on('createdPostReply', handleCreatedEntities);
    sseEmitter.on('createdRoomReply', handleCreatedEntities);
    sseEmitter.on('createdChatReply', handleCreatedEntities);

    return () => {
      sseEmitter.off('createdPostReply', handleCreatedEntities);
      sseEmitter.off('createdRoomReply', handleCreatedEntities);
      sseEmitter.off('createdChatReply', handleCreatedEntities);
    };
  }, [sseEmitter, handleCreatedEntities]);

  const handleDeletedEntities = useCallback((_params, {
    data: {
      replyType,
      replyId,
    },
  }) => {
    deleteEntities(replyType, entity => entity.id === replyId);
  }, [deleteEntities]);

  useEffect(() => {
    sseEmitter.on('deletedPostReply', handleDeletedEntities);
    sseEmitter.on('deletedRoomReply', handleDeletedEntities);
    sseEmitter.on('deletedChatReply', handleDeletedEntities);

    return () => {
      sseEmitter.off('deletedPostReply', handleDeletedEntities);
      sseEmitter.off('deletedRoomReply', handleDeletedEntities);
      sseEmitter.off('deletedChatReply', handleDeletedEntities);
    };
  }, [sseEmitter, handleDeletedEntities]);
}

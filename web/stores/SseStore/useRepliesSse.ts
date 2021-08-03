import SseEventEmitter from 'lib/singletons/SseEventEmitter';

export default function useRepliesSse() {
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
    SseEventEmitter.on('createdPostReply', handleCreatedEntities);
    SseEventEmitter.on('createdRoomReply', handleCreatedEntities);
    SseEventEmitter.on('createdChatReply', handleCreatedEntities);

    return () => {
      SseEventEmitter.off('createdPostReply', handleCreatedEntities);
      SseEventEmitter.off('createdRoomReply', handleCreatedEntities);
      SseEventEmitter.off('createdChatReply', handleCreatedEntities);
    };
  }, [handleCreatedEntities]);

  const handleDeletedEntities = useCallback((_params, {
    data: {
      replyType,
      replyId,
    },
  }) => {
    deleteEntities(replyType, entity => entity.id === replyId);
  }, [deleteEntities]);

  useEffect(() => {
    SseEventEmitter.on('deletedPostReply', handleDeletedEntities);
    SseEventEmitter.on('deletedRoomReply', handleDeletedEntities);
    SseEventEmitter.on('deletedChatReply', handleDeletedEntities);

    return () => {
      SseEventEmitter.off('deletedPostReply', handleDeletedEntities);
      SseEventEmitter.off('deletedRoomReply', handleDeletedEntities);
      SseEventEmitter.off('deletedChatReply', handleDeletedEntities);
    };
  }, [handleDeletedEntities]);
}

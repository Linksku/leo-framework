type DefaultSseParams = {
  notifCreated: {
    userId: ApiEntityId,
  },
  sseConnected: {
    sessionId: string,
  },
  sseHeartbeat: StrictlyEmptyObj,
};

export default DefaultSseParams;

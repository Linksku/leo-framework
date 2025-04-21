export type DefaultSseParams = {
  notifCreated: {
    userId: ApiEntityId,
  },
  sseConnected: {
    sessionId: string,
  },
  sseHeartbeat: StrictlyEmptyObj,
};

export type DefaultSseData = {
  notifCreated: null,
  sseConnected: null,
  sseHeartbeat: {
    subbedEventTypes: string[],
  },
};

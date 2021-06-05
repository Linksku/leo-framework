type ApiResponse<Name extends typeof ApiNameToData> = {
  entities: SerializedEntity | SerializedEntity[],
  data: ApiNameToData[Name],
  deletedIds: {
    [T in EntityType]?: number[];
  },
};

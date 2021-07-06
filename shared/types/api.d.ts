type ApiResponse<Name extends typeof ApiNameToData> = {
  data: ApiNameToData[Name],
  entities: SerializedEntity[],
  deletedIds?: {
    [T in EntityType]?: number[];
  },
  meta?: ObjectOf<{
    dateProps?: {
      [T in EntityType]?: string[];
    },
  }>,
};

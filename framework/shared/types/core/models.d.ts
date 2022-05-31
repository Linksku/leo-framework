type ModelTypeToRelations<T extends ModelType> = ModelRelationsMap[T] extends any
  ? {
    [K in keyof ModelRelationsMap[T]]: {
      modelType: ModelRelationsMap[T][K]['modelType'] & ModelType,
      tsType: ModelRelationsMap[T][K]['tsType'],
    };
  }
  : never;

type ModelRelationsTypes<T extends ModelType> = ModelRelationsMap[T] extends any
  ? Partial<{
    [K in keyof ModelRelationsMap[T]]: ModelRelationsMap[T][K]['tsType'];
  }>
  : never;

type ModelNestedRelations = {
  [Type in ModelType]: ValueOf<{
    [Name in keyof ModelTypeToRelations<Type>]: ValueOf<{
      [Name2 in keyof ModelTypeToRelations<ModelTypeToRelations<Type>[Name]['modelType']>]: `${Name & string}.${Name2 & string}`;
    }>;
  }>;
};

type ModelRelationType = 'hasOne' | 'belongsToOne' | 'hasMany' | 'manyToMany';

type EntityAction = 'load' | 'create' | 'update' | 'delete';

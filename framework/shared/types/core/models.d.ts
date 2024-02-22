interface IBaseModel {
  // todo: low/mid try making __isModel private
  __isModel: true;
}

type _CombineNestedRelationTypes<Nested, Relation> =
  null extends Relation ? Nested | null
  : [Relation, Nested] extends [any[], any[]] ? Nested
  : Relation extends any[] ? Exclude<Nested, null>[]
  : Nested;

type ModelNestedRelationsMap = {
  [Type in RRModelType]: UnionToIntersection<ValueOf<{
    [Name in keyof ModelRelationsMap[Type]]: ValueOf<{
      [Name2 in keyof ModelRelationsMap[ModelRelationsMap[Type][Name]['modelType']]]: {
        [NestedName in `${Name & string}.${Name2 & string}`]: {
          // eslint-disable-next-line max-len
          modelType: ModelRelationsMap[ModelRelationsMap[Type][Name]['modelType']][Name2]['modelType'],
          tsType: _CombineNestedRelationTypes<
            ModelRelationsMap[ModelRelationsMap[Type][Name]['modelType']][Name2]['tsType'],
            ModelRelationsMap[Type][Name]['tsType']
          >,
        };
      };
    }>;
    // eslint-disable-next-line @typescript-eslint/ban-types
  }>>;
};

type AllModelRelationsMap = {
  [Type in RRModelType]: {
    [K in keyof (ModelRelationsMap[Type] & ModelNestedRelationsMap[Type])]:
      (ModelRelationsMap[Type] & ModelNestedRelationsMap[Type])[K];
  };
};

type ModelRelationType = 'hasOne' | 'belongsToOne' | 'hasMany' | 'manyToMany';

type EntityAction = 'load' | 'create' | 'update' | 'delete';

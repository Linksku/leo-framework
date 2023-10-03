import type _Model from 'services/model/Model';
import type CustomQueryBuilder from 'services/model/Model/CustomQueryBuilder';

declare global {
  type Model = _Model;

  type RRModel = ModelInstancesMap[RRModelType];

  type ModelClass = typeof _Model;

  type RRModelClass = ModelClassesMap[RRModelType];

  type ModelInstance<T extends { instanceType: Model }> = T['instanceType'];

  type ModelTypeToInstance<T extends ModelType> = ModelType extends T ? Model
    : RRModelType extends T ? ModelInstancesMap[T]
    : EntityType extends T ? Entity
    : ModelInstancesMap[T];

  type ModelTypeToClass<T extends ModelType> = ModelType extends T ? ModelClass
    : RRModelType extends T ? RRModelClass
    : EntityType extends T ? EntityClass
    : ModelClassesMap[T];

  type ModelTypeToInterface<T extends ModelType> = IBaseModel & ModelInterfacesMap[T];

  type ModelPartial<T extends { Interface: IBaseModel }> = Partial<T['Interface']>;

  // todo: low/mid build types for required fields for insert
  type ModelPartialExact<
    T extends { Interface: IBaseModel },
    P,
  > = Partial<T['Interface']>
    & Pick<T['Interface'], (keyof P) & keyof T['Interface']>
    & Record<Exclude<keyof P, keyof T['Interface']>, never>;

  type ModelKey<T extends { Interface: IBaseModel }> = (keyof T['Interface']) & string;

  type ModelIndex<T extends { Interface: IBaseModel }> = ModelKey<T>[];

  // eslint-disable-next-line @typescript-eslint/naming-convention
  declare class __SCHEMA {
    private __SCHEMA: true;
  }

  type ModelSchema<T extends IBaseModel> = {
    [k in keyof T]: JsonSchema;
  } & __SCHEMA;

  type ModelColsMap<T extends IBaseModel> = {
    all: '*',
  } & {
    // For knex().select type
    [k in keyof T]: k;
  };

  type QueryBuilder<M extends Model, R = M[]> = CustomQueryBuilder<M, R>;

  type ModelRelationTypes = {
    [T in keyof AllModelRelationsMap]: keyof AllModelRelationsMap[T] extends any
      ? {
        [K in keyof AllModelRelationsMap[T]]: AllModelRelationsMap[T][K]['tsType'] extends any[]
          ? ModelInstancesMap[AllModelRelationsMap[T][K]['modelType']][]
          : AllModelRelationsMap[T][K]['tsType'] extends null
            ? null
            : ModelInstancesMap[AllModelRelationsMap[T][K]['modelType']];
      }
      : never;
  };
}

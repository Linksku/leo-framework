import type _Model from 'services/model/Model';
import type CustomQueryBuilder from 'services/model/Model/CustomQueryBuilder';

declare global {
  type Model = _Model;

  type ModelClass = typeof _Model;

  interface IBaseModel {
    __isModel: true;
  }

  type ModelInstance<T extends { instanceType: Model }> = T['instanceType'];

  type ModelTypeToInstance<T extends ModelType> = ModelType extends T ? Model
    : EntityType extends T ? Entity
    : ModelInstancesMap[T];

  type ModelTypeToClass<T extends ModelType> = ModelType extends T ? ModelClass
    : EntityType extends T ? EntityClass
    : ModelClassesMap[T];

  type ModelTypeToInterface<T extends ModelType> = IBaseModel & ModelInterfacesMap[T];

  type ModelPartial<T extends { Interface: IBaseModel }> = Partial<T['Interface']>;

  type ModelPartialDefined<
    T extends { Interface: IBaseModel },
    P extends ModelPartial<T>,
  > = P & (P extends any
      ? {
        [K in keyof P]: Defined<P[K]>;
      }
      : never);

  type ModelKey<T extends { Interface: IBaseModel }> = (keyof T['Interface']) & string;

  type ModelIndex<T extends { Interface: IBaseModel }> = ModelKey<T>[];

  type ModelSchema<T extends IBaseModel> = {
    [k in keyof T]: JSONSchema;
  };

  type ModelColsMap<T extends IBaseModel> = {
    all: string,
  } & {
    [k in keyof T]: string;
  };

  type ModelRelationTypes<T extends ModelType> = AllModelRelationsMap[T] extends any
    ? {
      [K in keyof AllModelRelationsMap[T]]: AllModelRelationsMap[T][K]['tsType'];
    }
    : never;

  type QueryBuilder<M extends Model, R = M[]> = CustomQueryBuilder<M, R>;
}

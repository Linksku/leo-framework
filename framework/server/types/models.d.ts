import type { QueryBuilder as _QueryBuilder } from 'objection';

import type _Model from 'lib/Model/Model';
import type { CustomQueryBuilderMethods } from 'lib/Model/Model/CustomQueryBuilder';

declare global {
  type Model = _Model;

  type ModelClass = typeof _Model;

  interface IBaseModel {
    __isModel: true;
  }

  type ModelTypeToInstance<T extends ModelType> = ModelType extends T ? Model
    : EntityType extends T ? Entity
    : ModelInstancesMap[T];

  type ModelTypeToClass<T extends ModelType> = ModelType extends T ? ModelClass
    : EntityType extends T ? EntityClass
    : ModelClassesMap[T];

  type ModelTypeToInterface<T extends ModelType> = IBaseModel & ModelInterfacesMap[T];

  type ModelPartial<T extends ModelClass> = Partial<T['Interface']>;

  type ModelKey<T extends ModelClass> = (keyof T['Interface']) & string;

  type ModelIndex<T extends ModelClass> = ModelKey<T> | ModelKey<T>[];

  type ModelSchema<T extends IBaseModel> = {
    [k in keyof T]: JSONSchema;
  };

  type ModelColsMap<T extends IBaseModel> = {
    all: string,
  } & {
    [k in keyof T]: string;
  };

  interface QueryBuilder<M extends Model, R = M[]>
    extends _QueryBuilder<M, R>, CustomQueryBuilderMethods {}
}

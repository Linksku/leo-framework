import validateUniquePartial from 'utils/models/validateUniquePartial';
import validateNotUniquePartial from 'utils/models/validateNotUniquePartial';
import BaseEntity from './BaseEntity';

import insertOne from './methods/insertOne';
import insertBulk from './methods/insertBulk';
import updateBulk from './methods/updateBulk';
import updateAll, { UpdateOpts } from './methods/updateAll';
import deleteBulk, { DeleteBulkOpts } from './methods/deleteBulk';
import deleteAll from './methods/deleteAll';

export default class EntityMutator extends BaseEntity {
  static insertOne = insertOne;

  static insertBulk = insertBulk;

  static async updateOne<
    T extends EntityClass,
    P extends ModelPartialExact<T, P> & ModelUniquePartial<T>,
    Obj extends ModelPartialExact<T, Obj>,
  >(
    this: T,
    partial: P,
    obj: Obj,
    opts?: UpdateOpts,
  ): Promise<EntityInstance<T> | null> {
    validateUniquePartial(this, partial);
    const updated = await updateAll.call(this, partial, obj, opts);
    return updated[0] ?? null;
  }

  static updateBulk = updateBulk;

  static async updateAll<
    T extends EntityClass,
    P extends ModelPartialExact<T, P>,
    Obj extends ModelPartialExact<T, Obj>,
  >(
    this: T,
    partial: P,
    obj: Obj,
    opts?: UpdateOpts,
  ): Promise<EntityInstance<T>[]> {
    validateNotUniquePartial(this, partial);
    return updateAll.call(this, partial, obj, opts);
  }

  static async deleteOne<
    T extends EntityClass,
    P extends ModelPartialExact<T, P> & ModelUniquePartial<T>,
  >(
    this: T,
    partial: P,
    opts?: DeleteBulkOpts,
  ): Promise<EntityInstance<T> | null> {
    const deleted = await deleteBulk.call(this, [partial], opts);
    return deleted[0] ?? null;
  }

  static deleteBulk = deleteBulk;

  static deleteAll = deleteAll;
}

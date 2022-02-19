import omit from 'lodash/omit';
import fromPairs from 'lodash/fromPairs';

import waitForMVIdInserted from 'lib/modelUtils/waitForMVIdInserted';
import waitForMVIdUpdated from 'lib/modelUtils/waitForMVIdUpdated';
import getPartialUniqueIndex from 'lib/modelUtils/getPartialUniqueIndex';
import modelsCache from 'services/cache/modelsCache';
import modelIdsCache from 'services/cache/modelIdsCache';
import type BTEntity from '../BTEntity';
import MVEntity from '../MVEntity';

export default class MVWithBTEntity extends MVEntity {
  static override get cacheable() {
    return this.sameAsBT;
  }

  static BTClass: typeof BTEntity;

  static sameAsBT: boolean;

  static MVDefaultCols: ObjectOf<any> = {};

  static MVOmitCols: string[] = [];

  static insertBT<T extends MVWithBTEntityClass>(
    this: T,
    obj: ModelPartial<T['BTClass']>,
    {
      onDuplicate,
    }: {
      onDuplicate?: 'error' | 'update' | 'ignore',
    } = {},
  ): Promise<InstanceType<T['BTClass']> | null> {
    return this.BTClass.insert<T['BTClass']>(obj, onDuplicate);
  }

  static async updateBT<T extends MVWithBTEntityClass>(
    this: T,
    partial: ModelPartial<T['BTClass']>,
    obj: ModelPartial<T['BTClass']>,
  ): Promise<InstanceType<T['BTClass']> | null> {
    return this.BTClass.update<T['BTClass']>(partial, obj);
  }

  static async updateBulkBT<T extends MVWithBTEntityClass>(
    this: T,
    uniqueIndex: ModelIndex<T['BTClass']>,
    objs: ModelPartial<T['BTClass']>[],
  ): Promise<(InstanceType<T['BTClass']> | null)[]> {
    return this.BTClass.updateBulk<T['BTClass']>(uniqueIndex, objs);
  }

  static async deleteBT<T extends MVWithBTEntityClass>(
    this: T,
    partial: ModelPartial<T['BTClass']>,
  ): Promise<InstanceType<T['BTClass']> | null> {
    return this.BTClass.delete<T['BTClass']>(partial);
  }

  static async deleteAllBT<T extends MVWithBTEntityClass>(
    this: T,
    partial: ModelPartial<T['BTClass']>,
  ): Promise<(InstanceType<T['BTClass']> | null)[]> {
    return this.BTClass.deleteAll<T['BTClass']>(partial);
  }

  static createMVEntityFromInsertedBT<T extends MVWithBTEntityClass>(
    this: T,
    ent: InstanceType<T['BTClass']>,
  ): InstanceType<T> {
    const obj = ent.toJSON({ virtuals: false }) as unknown as ModelPartial<T['BTClass']>;
    const requiredKeys = Object.keys(this.getSchema()).filter(
      k => !Object.prototype.hasOwnProperty.call(this.MVDefaultCols, k),
    );
    const missingKey = requiredKeys.find(k => !Object.prototype.hasOwnProperty.call(obj, k));
    if (missingKey) {
      throw new Error(`${this.name}.createMVEntityFromInsertedBT: missing key "${missingKey}"`);
    }

    return this.fromJson({
      ...this.MVDefaultCols,
      ...omit(obj, this.MVOmitCols),
    }) as InstanceType<T>;
  }

  static async insertBTReturningMVEntity<T extends MVWithBTEntityClass>(
    this: T,
    obj: ModelPartial<T['BTClass']>,
    {
      onDuplicate,
      waitForMVInserted = true,
    }: {
      onDuplicate?: 'error' | 'update' | 'ignore',
      waitForMVInserted?: boolean,
    } = {},
  ): Promise<InstanceType<T>> {
    let insertedBT = await this.insertBT(
      obj,
      { onDuplicate },
    );

    if (!insertedBT) {
      if (!onDuplicate || onDuplicate === 'error') {
        throw new Error(`${this.name}.insertBTReturningMVEntity: unknown insert error.`);
      }

      const uniqueIndex = getPartialUniqueIndex(this, obj);
      if (!uniqueIndex) {
        throw new Error(`${this.name}.insertBTReturningMVEntity: no unique index.`);
      }
      insertedBT = await this.BTClass.selectOne(
        (Array.isArray(uniqueIndex)
          ? fromPairs(uniqueIndex.map(k => [k, obj[k]]))
          : { [uniqueIndex]: obj[uniqueIndex] }) as ModelPartial<T['BTClass']>,
      );
      if (!insertedBT) {
        throw new Error(`${this.name}.insertBTReturningMVEntity: missing BT row.`);
      }
    }

    if (!insertedBT.isInitialVersion()) {
      const mvEnt = await waitForMVIdUpdated(this, insertedBT.id, insertedBT.version);
      await Promise.all([
        modelsCache.handleUpdate(this, mvEnt),
        modelIdsCache.handleUpdate(this, mvEnt),
      ]);
      return mvEnt;
    }
    if (waitForMVInserted) {
      await waitForMVIdInserted(this, insertedBT.id);
    }

    return this.createMVEntityFromInsertedBT(insertedBT);
  }

  static async insertBulkBTReturningMVEntities<T extends MVWithBTEntityClass>(
    this: T,
    objs: ModelPartial<T['BTClass']>[],
    {
      onDuplicate,
      waitForMVInserted = true,
    }: {
      onDuplicate?: 'error' | 'update' | 'ignore',
      waitForMVInserted?: boolean,
    } = {},
  ): Promise<InstanceType<T>[]> {
    if (!objs.length) {
      return [];
    }

    const insertedBTs = await this.BTClass.insertBulk<T['BTClass']>(objs, onDuplicate);

    return Promise.all(insertedBTs.map(async (ent, idx) => {
      const obj = objs[idx];

      if (!ent) {
        if (!onDuplicate || onDuplicate === 'error') {
          throw new Error(`${this.name}.insertBTReturningMVEntity: unknown insert error.`);
        }

        const uniqueIndex = getPartialUniqueIndex(this, obj);
        if (!uniqueIndex) {
          throw new Error(`${this.name}.insertBTReturningMVEntity: no unique index.`);
        }
        ent = await this.BTClass.selectOne(
          (Array.isArray(uniqueIndex)
            ? fromPairs(uniqueIndex.map(k => [k, obj[k]]))
            : { [uniqueIndex]: obj[uniqueIndex] }) as ModelPartial<T['BTClass']>,
        );
        if (!ent) {
          throw new Error(`${this.name}.insertBTReturningMVEntity: missing BT row.`);
        }
      }

      if (!ent.isInitialVersion()) {
        const mvEnt = await waitForMVIdUpdated(this, ent.id, ent.version);
        await Promise.all([
          modelsCache.handleUpdate(this, mvEnt),
          modelIdsCache.handleUpdate(this, mvEnt),
        ]);
        return mvEnt;
      }
      if (waitForMVInserted) {
        await waitForMVIdInserted(this, ent.id);
      }
      return this.createMVEntityFromInsertedBT(ent);
    }));
  }

  static async updateBTReturningMVEntity<T extends MVWithBTEntityClass>(
    this: T,
    partial: ModelPartial<T> & ModelPartial<T['BTClass']>,
    obj: ModelPartial<T['BTClass']>,
  ): Promise<InstanceType<T> | null> {
    const updatedBT = await this.updateBT(partial, obj);
    if (!updatedBT) {
      return null;
    }

    // Too hard to create MV ent without waiting for MV to update.
    const mvEnt = await waitForMVIdUpdated(this, updatedBT.id, updatedBT.version);

    await Promise.all([
      modelsCache.handleUpdate(this, mvEnt),
      modelIdsCache.handleUpdate(this, mvEnt),
    ]);
    return mvEnt;
  }

  static async updateBulkBTReturningMVEntities<T extends MVWithBTEntityClass>(
    this: T,
    uniqueIndex: ModelIndex<T['BTClass']>,
    objs: ModelPartial<T['BTClass']>[],
  ): Promise<(InstanceType<T> | null)[]> {
    if (!objs.length) {
      return [];
    }

    const updatedBTs = await this.updateBulkBT(uniqueIndex, objs);
    return Promise.all(updatedBTs.map(async ent => {
      if (!ent) {
        return null;
      }

      const mvEnt = await waitForMVIdUpdated(this, ent.id, ent.version);
      await Promise.all([
        modelsCache.handleUpdate(this, mvEnt),
        modelIdsCache.handleUpdate(this, mvEnt),
      ]);
      return mvEnt;
    }));
  }
}

export type MVWithBTEntityClass = typeof MVWithBTEntity;

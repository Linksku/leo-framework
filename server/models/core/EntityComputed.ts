import type { QueryContext } from 'objection';

import type ComputedUpdatersManagerType from 'services/computedUpdaters/ComputedUpdatersManager';
import ucFirst from 'lib/ucFirst';
import EntityBase from './EntityBase';

let ComputedUpdatersManager: typeof ComputedUpdatersManagerType | undefined;

export default class EntityComputed extends EntityBase {
  // db -> node
  $parseDatabaseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$parseDatabaseJson(obj);

    for (const col of Object.keys(obj)) {
      if (col.startsWith('computed')) {
        const name = col.slice('computed'.length);
        obj[name[0].toLowerCase() + name.slice(1)] = obj[col];
        delete obj[col];
      }
    }

    return obj;
  }

  // node -> db
  $formatDatabaseJson(
    obj: ObjectOf<any>,
  ): ObjectOf<any> {
    obj = super.$formatDatabaseJson(obj);
    const cls = (this.constructor as typeof EntityComputed);
    for (const property of Object.keys(obj)) {
      // @ts-ignore casting Object.keys doesn't work
      if (cls.getComputedProperties().has(property)) {
        const name = ucFirst(property);
        obj[`computed${name}`] = obj[property];
        delete obj[property];
      }
    }
    return obj;
  }

  async $afterInsert(ctx: QueryContext) {
    await super.$afterInsert(ctx);

    if (!ComputedUpdatersManager) {
      // eslint-disable-next-line global-require
      ComputedUpdatersManager = require('services/computedUpdaters/ComputedUpdatersManager').default;
    }

    ComputedUpdatersManager!.triggerUpdates((this.constructor as typeof Entity).type);
  }
}

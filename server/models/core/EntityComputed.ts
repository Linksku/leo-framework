import type { QueryContext } from 'objection';

import type ComputedUpdatersManagerType from 'services/computedUpdaters/ComputedUpdatersManager';
import ucFirst from 'lib/ucFirst';
import EntityBase from './EntityBase';

let ComputedUpdatersManager: typeof ComputedUpdatersManagerType | undefined;

export function getPropWithComputed(Model: typeof EntityBase, prop: string) {
  // @ts-ignore don't know how to fix
  if (Model.getComputedProperties().has(prop)) {
    return `computed${ucFirst(prop)}`;
  }
  return prop;
}

export function getPropWithoutComputed(prop: string) {
  if (prop.startsWith('computed')) {
    const newProp = prop.slice('computed'.length);
    return newProp[0].toLowerCase() + newProp.slice(1);
  }
  return prop;
}

export default class EntityComputed extends EntityBase {
  // db -> node
  $parseDatabaseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$parseDatabaseJson(obj);

    for (const prop of Object.keys(obj)) {
      const newProp = getPropWithoutComputed(prop);
      if (newProp !== prop) {
        obj[newProp] = obj[prop];
        delete obj[prop];
      }
    }

    return obj;
  }

  // node -> db
  $formatDatabaseJson(obj: ObjectOf<any>): ObjectOf<any> {
    obj = super.$formatDatabaseJson(obj);
    const cls = (this.constructor as typeof EntityComputed);
    for (const prop of Object.keys(obj)) {
      const newProp = getPropWithComputed(cls, prop);
      if (newProp !== prop) {
        obj[newProp] = obj[prop];
        delete obj[prop];
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

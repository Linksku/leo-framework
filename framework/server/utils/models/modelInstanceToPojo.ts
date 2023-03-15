import cloneDeep from 'lodash/cloneDeep';
import dayjs from 'dayjs';
import deepFreezeIfDev from 'utils/deepFreezeIfDev';

function invalidClassName(val: any): string | null {
  if (val == null || typeof val !== 'object') {
    return null;
  }

  if (Array.isArray(val)) {
    for (const v of val) {
      const name = invalidClassName(v);
      if (name) {
        return name;
      }
    }
    return null;
  }

  const proto = Object.getPrototypeOf(val);
  if (proto === Date.prototype) {
    return null;
  }
  if (proto !== Object.prototype) {
    return proto.constructor.name || 'Unknown';
  }

  for (const k of Object.keys(val)) {
    const name = invalidClassName(val[k]);
    if (name) {
      return name;
    }
  }

  return null;
}

export default function modelInstanceToPojo<T extends ModelClass>(
  instance: ModelInstance<T>,
  cloneProps = true,
): ModelPartial<T> {
  const Model = instance.constructor as T;
  const fullSchema = Model.getSchema();

  const obj: ModelPartial<T> = {};
  for (const k of TS.objKeys(fullSchema)) {
    if (!TS.hasProp(instance, k)) {
      continue;
    }

    let val = instance[k] as any;
    if (val instanceof Buffer) {
      val = val.toString('utf8').replace(/\0/g, '');
    }

    if (!process.env.PRODUCTION) {
      const name = invalidClassName(val);
      if (name) {
        if (Array.isArray(val)) {
          throw new TypeError(`modelInstanceToPojo(${Model.type}): "${k}" array contains "${name}"`);
        } else if (val == null || typeof val !== 'object') {
          throw new TypeError(`modelInstanceToPojo(${Model.type}): ${k} object contains "${name}"`);
        } else {
          throw new TypeError(`modelInstanceToPojo(${Model.type}): ${k} is "${name}"`);
        }
      }
    }

    obj[k] = cloneProps && val && typeof val === 'object'
      && !(val instanceof Date) && !(val instanceof dayjs)
      ? cloneDeep(val)
      : deepFreezeIfDev(val);
  }

  return obj;
}

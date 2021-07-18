// @ts-nocheck
import uniqueArray from 'lib/uniqueArray';

export default function mergeConcatArrays<T1, T2>(obj1: T1, obj2: T2): T1 & T2 {
  if (obj1 === obj2) {
    return obj1;
  }
  if (obj1 == null) {
    return obj2;
  }
  if (obj2 == null) {
    return obj1;
  }
  if (Array.isArray(obj1) && Array.isArray(obj2)) {
    return uniqueArray([...obj1, ...obj2]);
  }
  if (typeof obj1 === 'object' && typeof obj2 === 'object') {
    const newObj = {};
    for (const k of Object.keys(obj1)) {
      newObj[k] = mergeConcatArrays(obj1[k], obj2[k]);
    }
    for (const k of Object.keys(obj2)) {
      if (!Object.prototype.hasOwnProperty.call(obj1, k)) {
        newObj[k] = obj2[k];
      }
    }
    return newObj;
  }
  return obj2;
}

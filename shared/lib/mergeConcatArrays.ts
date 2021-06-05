import uniqueArray from 'lib/uniqueArray';

export default function mergeConcatArrays(obj1: any, obj2: any) {
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
    for (const k of Object.keys(obj1)) {
      obj1[k] = mergeConcatArrays(obj1[k], obj2[k]);
    }
    for (const k of Object.keys(obj2)) {
      if (!Object.prototype.hasOwnProperty.call(obj1, k)) {
        obj1[k] = obj2[k];
      }
    }
    return obj1;
  }
  return obj2;
}

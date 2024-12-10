// Compares equality of objects 1 level deep.
export default function shallowEqual(objA: any, objB: any): boolean {
  if (objA === objB) {
    return true;
  }

  if (objA === null || objB === null) {
    return false;
  }
  if (Array.isArray(objA) && Array.isArray(objB)) {
    if (objA.length !== objB.length) {
      return false;
    }

    for (let i = 0; i < objA.length; i++) {
      if (objA[i] !== objB[i]) {
        return false;
      }
    }
  } else if (TS.isObj(objA) && TS.isObj(objB)) {
    const keysA = TS.objKeys(objA);
    const keysB = TS.objKeys(objB);

    if (keysA.length !== keysB.length) {
      return false;
    }

    for (const k of keysA) {
      if (!Object.prototype.hasOwnProperty.call(objB, k) || objA[k] !== objB[k]) {
        return false;
      }
    }
  } else {
    return false;
  }

  return true;
}
